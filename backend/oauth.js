// oauth.js
// Slack OAuth用エンドポイント (Serverless Framework v3, Node.js 22)
// Slackワークスペース追加時のOAuthフローをサポート

import { Hono } from "hono";
import { cors } from 'hono/cors'
import { handle } from "hono/aws-lambda";
import axios from "axios";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { SLACK_SCOPES } from "./config/slack_scopes.js";

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID;
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET;
const SLACK_REDIRECT_URI = process.env.SLACK_REDIRECT_URI;
const DYNAMODB_TABLE = process.env.DYNAMODB_TABLE || "SlackIntegrations";
const DYNAMODB_REGION = process.env.DYNAMODB_REGION || "ap-northeast-1";

const ddbClient = new DynamoDBClient({ region: DYNAMODB_REGION });
const dynamodb = DynamoDBDocumentClient.from(ddbClient);
const app = new Hono();

// CORS対応ミドルウェア
app.use("*", cors({
  origin: '*', // Access-Control-Allow-Origin
  credentials: true, // Access-Control-Allow-Credentials
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "application/json"],
}))

// Slack OAuthコールバック
app.get("/slack/oauth/callback", async (context) => {
  const { code } = context.req.query();
  try {
    console.log("oAuthコールバック処理開始");
    const result = await axios.post(
      "https://slack.com/api/oauth.v2.access",
      null,
      {
        params: {
          code,
          client_id: SLACK_CLIENT_ID,
          client_secret: SLACK_CLIENT_SECRET,
          redirect_uri: SLACK_REDIRECT_URI,
        },
      }
    );
    if (result.data.ok) {
      console.log("Slack OAuth成功:", result.data);
      // DynamoDBにアクセストークン・ワークスペース情報を保存
      const {
        access_token,
        team,
        authed_user,
        bot_user_id,
        scope,
        app_id,
        token_type,
      } = result.data;
      const workspaceId = team?.id;
      if (!workspaceId) throw new Error("team.idが取得できません");
      const item = {
        PK: "WORKSPACE#",
        SK: workspaceId,
        access_token,
        team,
        authed_user,
        bot_user_id,
        scope,
        app_id,
        token_type,
        updatedAt: new Date().toISOString(),
      };
      await dynamodb.send(
        new PutCommand({
          TableName: DYNAMODB_TABLE,
          Item: item,
        })
      );
      return context.json({
        done: true,
        message: "Slackワークスペース連携が完了しました。画面を閉じてください。",
      });
    } else {
      return context.json({
        done: false,
        message: "Slack OAuth失敗: " + result.data.error,
      });
    }
  } catch (e) {
    return context.json({ done: false, message: "Slack OAuthエラー: " + e.message });
  }
});

// OAuth認可URLを返すAPI
app.get("/slack/oauth/url", (context) => {
  const state = Math.random().toString(36).substring(2);
  const scopeParam = SLACK_SCOPES.join(",");
  const url = `https://slack.com/oauth/v2/authorize?client_id=${SLACK_CLIENT_ID}&scope=${scopeParam}&redirect_uri=${encodeURIComponent(
    SLACK_REDIRECT_URI
  )}&state=${state}`;
  return context.json({ done: true, url });
});

// 承認済みワークスペース一覧取得API
app.get("/slack/oauth/workspaces", async (context) => {
  try {
    console.log("Fetching workspaces from DynamoDB");
    const params = {
      TableName: DYNAMODB_TABLE,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: { ":pk": "WORKSPACE#" },
    };
    const result = await dynamodb.send(new QueryCommand(params));
    const workspaces = (result.Items || []).map((item) => ({
      id: item.SK,
      name: item.team?.name || item.SK,
    }));
    return context.json({ done: true, data: workspaces });
  } catch (e) {
    return context.json({ done: false, message: e.message });
  }
});

// チャンネル一覧取得API

app.get("/slack/oauth/channels", async (context) => {
  console.log("チャンネル一覧取得開始");
  const { workspaceId } = context.req.query();
  if (!workspaceId)
    return context.json({ done: false, message: "workspaceId is required" });
  try {
    // DynamoDBから該当ワークスペースのアクセストークンを取得
    const getParams = {
      TableName: DYNAMODB_TABLE,
      Key: {
        PK: "WORKSPACE#",
        SK: workspaceId,
      },
    };
    const result = await dynamodb.send(
      new QueryCommand({
        TableName: DYNAMODB_TABLE,
        KeyConditionExpression: "PK = :pk and SK = :sk",
        ExpressionAttributeValues: { ":pk": "WORKSPACE#", ":sk": workspaceId },
      })
    );
    const item = (result.Items && result.Items[0]) || null;
    const accessToken = item?.access_token;
    if (!accessToken)
      return context.json({ done: false, message: "アクセストークンが見つかりません" });
    // 取得したアクセストークンでSlack APIを実行
    const slackResult = await axios.get(
      "https://slack.com/api/conversations.list",
      {
        params: { types: "public_channel,private_channel", limit: 1000 },
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (!slackResult.data.ok) throw new Error(slackResult.data.error);
    const channels = (slackResult.data.channels || []).map((ch) => ({
      id: ch.id,
      name: ch.name,
    }));
    return context.json({ done: true, data: channels });
  } catch (e) {
    return context.json({ done: false, message: e.message });
  }
});

export const handler = handle(app);
