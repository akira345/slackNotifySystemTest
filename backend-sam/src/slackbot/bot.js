// bot.js
// Slack連携技術検証用SlackBot (AWS SAM + Bolt + Node.js 22)
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

// 環境変数から設定を取得
const DYNAMODB_TABLE = process.env.DYNAMODB_TABLE || "SlackIntegrations";
const DYNAMODB_REGION = process.env.DYNAMODB_REGION || "ap-northeast-1";
const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID;
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET;
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;
const SLACK_STATE_SECRET = process.env.SLACK_STATE_SECRET || "state-secret";
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN; // 初回時のみ有効にする

// DynamoDBクライアント（v3）
const ddbClient = new DynamoDBClient({ region: DYNAMODB_REGION });
const dynamodb = DynamoDBDocumentClient.from(ddbClient);

// OAuth用レシーバ
const awsLambdaReceiver = new AwsLambdaReceiver({
  signingSecret: SLACK_SIGNING_SECRET,
});

// Boltアプリ
const app = new App({
  token: SLACK_BOT_TOKEN, // 自分のワークスペースでのみ有効なトークン
  receiver: awsLambdaReceiver,
  logLevel: LogLevel.DEBUG,
  signingSecret: SLACK_SIGNING_SECRET,
  clientId: SLACK_CLIENT_ID,
  clientSecret: SLACK_CLIENT_SECRET,
  stateSecret: SLACK_STATE_SECRET, // OAuth認証のstateを管理するためのシークレット
  scopes: SLACK_SCOPES,
  // このイベントの発生条件がよくわからない・・・が開発ドキュメントに従いDynamoDBに情報を格納しておく
  installationStore: {
    storeInstallation: async (installation) => {
      console.log("Storing installation:", installation);
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
      console.log("Fetching installation for:", installQuery);
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
      console.log("Deleting installation for:", installQuery);
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

// Lambdaハンドラ
export const handler = async (event, context, callback) => {
  console.log("Start");
  console.log(JSON.stringify(event));
  console.log(JSON.stringify(context));
  const handler = await awsLambdaReceiver.start();
  return handler(event, context, callback);
};
