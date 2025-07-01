// bot.js
// CDK版 Slack連携技術検証用SlackBot (Bolt, AWS Lambda)
// OAuthインストール対応
// 検証用なので特に何かコマンドを受け付けたり、気の利いた応答をする訳ではない

import pkg from "@slack/bolt";
const { App, AwsLambdaReceiver, LogLevel } = pkg;
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  DeleteCommand,
  PutCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";
import { SLACK_SCOPES } from '../shared/slack_scopes.js';
import fs from 'fs';
import yaml from 'js-yaml';

// 機密設定ファイルを読み込む関数
function loadSecrets() {
  try {
    const secretsPath = process.env.LAMBDA_TASK_ROOT 
      ? '/opt/config/secrets.yml'  // Lambda環境では/optに配置
      : '../config/secrets.yml';  // ローカル開発環境
    
    if (fs.existsSync(secretsPath)) {
      const fileContents = fs.readFileSync(secretsPath, 'utf8');
      return yaml.load(fileContents);
    }
  } catch (error) {
    console.warn('secrets.ymlファイルの読み込みに失敗しました。環境変数を使用します。', error.message);
  }
  return {};
}

// 機密設定の読み込み
const secrets = loadSecrets();

// 環境変数または設定ファイルから設定を取得
const DYNAMODB_TABLE = process.env.DYNAMODB_TABLE || secrets.DYNAMODB_TABLE || "SlackIntegrations";
const DYNAMODB_REGION = process.env.DYNAMODB_REGION || secrets.DYNAMODB_REGION || "ap-northeast-1";
const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID || secrets.SLACK_CLIENT_ID;
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET || secrets.SLACK_CLIENT_SECRET;
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET || secrets.SLACK_SIGNING_SECRET;
const SLACK_STATE_SECRET = process.env.SLACK_STATE_SECRET || secrets.SLACK_STATE_SECRET || "state-secret";
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN || secrets.SLACK_BOT_TOKEN; // 初回時のみ有効にする

// DynamoDBクライアント（v3）
const ddbClient = new DynamoDBClient({ region: DYNAMODB_REGION });
const dynamodb = DynamoDBDocumentClient.from(ddbClient);

// OAuth用レシーバ
const awsLambdaReceiver = new AwsLambdaReceiver({
  signingSecret: SLACK_SIGNING_SECRET,
});

// Boltアプリ初期化
const app = new App({
  token: SLACK_BOT_TOKEN, // 自分のワークスペースでのみ有効なトークン
  receiver: awsLambdaReceiver,
  logLevel: LogLevel.DEBUG,
  signingSecret: SLACK_SIGNING_SECRET,
  clientId: SLACK_CLIENT_ID,
  clientSecret: SLACK_CLIENT_SECRET,
  stateSecret: SLACK_STATE_SECRET, // OAuth認証のstateを管理するためのシークレット
  scopes: SLACK_SCOPES,
  
  // インストール情報の保存・取得・削除処理
  // このイベントの発生条件がよくわからない・・・が開発ドキュメントに従いDynamoDBに情報を格納しておく
  installationStore: {
    storeInstallation: async (installation) => {
      console.log("インストール情報を保存中:", installation);
      const workspaceId = installation.team.id;
      const params = {
        TableName: DYNAMODB_TABLE,
        Item: {
          PK: "INSTALLATION#",
          SK: workspaceId,
          installation,
        },
      };
      await dynamodb.send(new PutCommand(params));
    },
    
    fetchInstallation: async (installQuery) => {
      console.log("インストール情報を取得中:", installQuery);
      const workspaceId = installQuery.teamId;
      const params = {
        TableName: DYNAMODB_TABLE,
        Key: {
          PK: "INSTALLATION#",
          SK: workspaceId,
        },
      };
      const result = await dynamodb.send(new GetCommand(params));
      return result.Item ? result.Item.installation : null;
    },
    
    deleteInstallation: async (installQuery) => {
      console.log("インストール情報を削除中:", installQuery);
      const workspaceId = installQuery.teamId;
      const params = {
        TableName: DYNAMODB_TABLE,
        Key: {
          PK: "INSTALLATION#",
          SK: workspaceId,
        },
      };
      const result = await dynamodb.send(new DeleteCommand(params));
      return result.Item ? result.Item.installation : null;
    },
  },
});

// Lambdaハンドラ（CDK版）
export const handler = async (event, context, callback) => {
  console.log("SlackBot Lambda処理開始");
  console.log("Event:", JSON.stringify(event));
  console.log("Context:", JSON.stringify(context));
  
  const handler = await awsLambdaReceiver.start();
  return handler(event, context, callback);
};
