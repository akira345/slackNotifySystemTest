// app.js
// CDK版 Slack連携技術検証用バックエンド (AWS Lambda + Node.js 22)
// 主な役割: API Gateway経由のHTTPリクエストを受け、DynamoDBとSlack APIを操作する

import express from "express";
import serverless from "serverless-http";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  GetCommand,
  PutCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { WebClient } from "@slack/web-api";

// 環境変数から設定を取得
const DYNAMODB_TABLE = process.env.DYNAMODB_TABLE || "SlackIntegrations";
const DYNAMODB_REGION = process.env.DYNAMODB_REGION || "ap-northeast-1";

// DynamoDBクライアント初期化（v3）
const ddbClient = new DynamoDBClient({ region: DYNAMODB_REGION });
const dynamodb = DynamoDBDocumentClient.from(ddbClient);

// Expressアプリ初期化
const app = express();
app.use(express.json());

// CORS対応ミドルウェア
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Content-Type", "application/json");
  res.header("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// すべてのリクエストをログ出力
app.use((req, res, next) => {
  let bodyLog;
  if (Buffer.isBuffer(req.body)) {
    bodyLog = req.body.toString();
  } else {
    try {
      bodyLog = JSON.stringify(req.body, null, 2);
    } catch {
      bodyLog = String(req.body);
    }
  }
  console.log("リクエスト受信:", req.method, req.path, "body:", bodyLog);
  next();
});

// ユーティリティ: Slackチャンネル名・ワークスペース名解決
async function resolveSlackNames(slackWorkspaceId, slackChannelId) {
  // DynamoDBからワークスペースごとのアクセストークンを取得
  let slackChannelName = slackChannelId;
  let slackWorkspaceName = slackWorkspaceId;
  let accessToken = "";
  
  try {
    // ワークスペースIDからDynamoDBでアクセストークン取得
    const getParams = {
      TableName: DYNAMODB_TABLE,
      Key: {
        PK: "WORKSPACE#",
        SK: slackWorkspaceId,
      },
    };
    const result = await dynamodb.send(new GetCommand(getParams));
    if (result.Item && result.Item.access_token) {
      accessToken = result.Item.access_token;
    } else {
      console.warn("アクセストークンが見つかりません", { slackWorkspaceId });
      return { slackChannelName, slackWorkspaceName }; // IDのまま返す
    }

    const slackClient = new WebClient(accessToken);
    
    // チャンネル名取得
    const channelInfo = await slackClient.conversations.info({
      channel: slackChannelId,
      token: accessToken,
    });
    if (channelInfo.ok && channelInfo.channel && channelInfo.channel.name) {
      slackChannelName = channelInfo.channel.name;
    }

    // ワークスペース名取得
    const teamInfo = await slackClient.team.info({
      team: slackWorkspaceId,
      token: accessToken,
    });
    if (teamInfo.ok && teamInfo.team && teamInfo.team.name) {
      slackWorkspaceName = teamInfo.team.name;
    }
  } catch (e) {
    console.error("resolveSlackNames失敗", {
      slackWorkspaceId,
      slackChannelId,
      error: e,
    });
    // 失敗時はIDのまま返す
  }
  return { slackChannelName, slackWorkspaceName };
}

// 一覧取得エンドポイント
app.post("/projects/:projectId/integrations", async (req, res) => {
  /**
   * 指定projectIdの全Slack連携情報をDynamoDBから取得し、
   * Slack APIでチャンネル名・ワークスペース名を解決して返す
   */
  try {
    console.log("一覧取得開始");
    const projectId = req.params.projectId;
    const params = {
      TableName: DYNAMODB_TABLE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :skprefix)",
      ExpressionAttributeValues: {
        ":pk": `PROJECT#${projectId}`,
        ":skprefix": "INTEGRATION#",
      },
    };
    const result = await dynamodb.send(new QueryCommand(params));
    const items = result.Items || [];
    console.log(`取得した連携数: ${items.length}`);
    
    if (items.length === 0) {
      return res.status(200).json({ done: true, data: [] });
    }
    
    console.log("Slack名解決開始");
    // Slack名解決
    const data = await Promise.all(
      items.map(async (item) => {
        const s = item.settings || {};
        const { slackChannelName, slackWorkspaceName } =
          await resolveSlackNames(s.slackWorkspaceId, s.slackChannelId);
        return {
          integrationId: s.integrationId,
          name: s.name,
          slackChannelName,
          slackWorkspaceName,
          description: s.description,
          notificationEvents: s.notificationEvents,
        };
      })
    );
    console.log("一覧取得完了");
    res.status(200).json({ done: true, data });
  } catch (e) {
    console.error("一覧取得エラー:", e);
    res.status(200).json({ done: false, message: e.message });
  }
});

// 新規追加エンドポイント
app.post("/projects/:projectId/integrations/add", async (req, res) => {
  /**
   * Slack連携情報を新規追加
   */
  try {
    console.log("新規追加開始");
    const projectId = req.params.projectId;
    console.log("リクエストボディ:", req.body.toString());

    const {
      slackWorkspaceId,
      slackChannelId,
      notificationEvents,
      description,
    } = JSON.parse(req.body.toString());
    
    // バリデーション
    if (!slackWorkspaceId) {
      return res
        .status(400)
        .json({ done: false, message: "ワークスペースは必須です" });
    }
    if (!slackChannelId) {
      return res
        .status(400)
        .json({ done: false, message: "Slackチャネルは必須です" });
    }
    if (
      !notificationEvents ||
      !Array.isArray(notificationEvents) ||
      notificationEvents.length === 0
    ) {
      return res.status(400).json({
        done: false,
        message: "通知イベントは1つ以上選択してください",
      });
    }
    
    const integrationId = uuidv4();
    
    // Slack名解決
    const { slackChannelName, slackWorkspaceName } = await resolveSlackNames(
      slackWorkspaceId,
      slackChannelId
    );
    const name = `${slackWorkspaceName} - ${slackChannelName} 連携`;
    
    const settings = {
      integrationId,
      name,
      slackChannelId,
      slackWorkspaceId,
      ProjectId: projectId,
      notificationEvents,
      description: description || "",
    };
    
    const params = {
      TableName: DYNAMODB_TABLE,
      Item: {
        PK: `PROJECT#${projectId}`,
        SK: `INTEGRATION#${integrationId}`,
        settings,
      },
    };
    
    console.log("DynamoDBに保存中", params);
    await dynamodb.send(new PutCommand(params), {
      removeUndefinedValues: true,
    });
    
    // integrationIdも返す
    res.status(200).json({ done: true, data: { ...settings, integrationId } });
  } catch (e) {
    console.log("新規追加エラー:", e);
    res.status(200).json({ done: false, message: e.message });
  }
});

// 個別取得エンドポイント
app.post(
  "/projects/:projectId/integrations/:integrationId",
  async (req, res) => {
    /**
     * 指定projectId/integrationIdのSlack連携情報をDynamoDBから取得
     */
    try {
      const projectId = req.params.projectId;
      const integrationId = req.params.integrationId;
      const params = {
        TableName: DYNAMODB_TABLE,
        Key: {
          PK: `PROJECT#${projectId}`,
          SK: `INTEGRATION#${integrationId}`,
        },
      };
      const result = await dynamodb.send(new GetCommand(params));
      if (!result.Item) {
        return res
          .status(200)
          .json({ done: false, message: "Integration not found" });
      }
      res.status(200).json({ done: true, data: result.Item.settings });
    } catch (e) {
      res.status(200).json({ done: false, message: e.message });
    }
  }
);

// 編集エンドポイント
app.post(
  "/projects/:projectId/integrations/:integrationId/edit",
  async (req, res) => {
    /**
     * description, notificationEventsのみ更新
     */
    try {
      const projectId = req.params.projectId;
      const integrationId = req.params.integrationId;
      const { description, notificationEvents } = JSON.parse(
        req.body.toString()
      );
      
      // 既存取得
      const getParams = {
        TableName: DYNAMODB_TABLE,
        Key: {
          PK: `PROJECT#${projectId}`,
          SK: `INTEGRATION#${integrationId}`,
        },
      };
      const result = await dynamodb.send(new GetCommand(getParams));
      if (!result.Item) {
        return res
          .status(200)
          .json({ done: false, message: "Integration not found" });
      }
      
      // 更新
      const settings = result.Item.settings;
      settings.description = description || "";
      settings.notificationEvents = notificationEvents || [];
      
      const putParams = {
        TableName: DYNAMODB_TABLE,
        Item: {
          PK: `PROJECT#${projectId}`,
          SK: `INTEGRATION#${integrationId}`,
          settings,
        },
      };
      await dynamodb.send(new PutCommand(putParams));
      res.status(200).json({ done: true, data: settings });
    } catch (e) {
      res.status(200).json({ done: false, message: e.message });
    }
  }
);

// 削除エンドポイント
app.post(
  "/projects/:projectId/integrations/:integrationId/delete",
  async (req, res) => {
    /**
     * 指定連携情報を削除
     */
    try {
      const projectId = req.params.projectId;
      const integrationId = req.params.integrationId;
      
      // 既存取得
      const getParams = {
        TableName: DYNAMODB_TABLE,
        Key: {
          PK: `PROJECT#${projectId}`,
          SK: `INTEGRATION#${integrationId}`,
        },
      };
      const result = await dynamodb.send(new GetCommand(getParams));
      
      if (result.Item) {
        const s = result.Item.settings;
        // ワークスペースのアクセストークン取得
        const wsParams = {
          TableName: DYNAMODB_TABLE,
          Key: {
            PK: "WORKSPACE#",
            SK: s.slackWorkspaceId,
          },
        };
        const wsResult = await dynamodb.send(new GetCommand(wsParams));
        const accessToken = wsResult.Item?.access_token;
        
        if (accessToken) {
          const slack = new WebClient(accessToken);
          try {
            await slack.conversations.kick({
              channel: s.slackChannelId,
              user: wsResult.Item.bot_user_id,
            });
            console.log("チャネルからアプリ削除成功");
          } catch (kickErr) {
            if (
              kickErr.data?.error !== "not_in_channel" &&
              kickErr.data?.error !== "cant_kick_self"
            ) {
              console.warn("チャネルからアプリ削除失敗:", kickErr);
            }
          }
        }
      }
      
      // DynamoDBから削除
      const params = {
        TableName: DYNAMODB_TABLE,
        Key: {
          PK: `PROJECT#${projectId}`,
          SK: `INTEGRATION#${integrationId}`,
        },
      };
      await dynamodb.send(new DeleteCommand(params));
      res.status(200).json({ done: true });
    } catch (e) {
      res.status(200).json({ done: false, message: e.message });
    }
  }
);

// テストメッセージ送信API
app.post(
  "/projects/:projectId/integrations/:integrationId/test",
  async (req, res) => {
    /**
     * 指定integrationIdのSlackワークスペース・チャネルにテストメッセージを送信
     */
    try {
      console.log("テストメッセージ送信開始");
      const projectId = req.params.projectId;
      const integrationId = req.params.integrationId;
      
      // integration情報取得
      const getParams = {
        TableName: DYNAMODB_TABLE,
        Key: {
          PK: `PROJECT#${projectId}`,
          SK: `INTEGRATION#${integrationId}`,
        },
      };
      const result = await dynamodb.send(new GetCommand(getParams));
      if (!result.Item) {
        return res
          .status(200)
          .json({ done: false, message: "Integration not found" });
      }
      
      console.log("取得した連携情報:", result.Item);
      const s = result.Item.settings;
      
      // ワークスペースのアクセストークン取得
      const wsParams = {
        TableName: DYNAMODB_TABLE,
        Key: {
          PK: "WORKSPACE#",
          SK: s.slackWorkspaceId,
        },
      };
      const wsResult = await dynamodb.send(new GetCommand(wsParams));
      const accessToken = wsResult.Item?.access_token;
      
      if (!accessToken) {
        return res
          .status(200)
          .json({ done: false, message: "アクセストークンが見つかりません" });
      }
      
      console.log("取得したアクセストークン:", accessToken);
      
      // Slack APIでメッセージ送信
      const slack = new WebClient(accessToken);
      const testText = `テストメッセージ送信: ${new Date().toLocaleString()}`;
      
      try {
        await slack.chat.postMessage({
          channel: s.slackChannelId,
          text: testText,
        });
        console.log("テストメッセージ送信成功:", testText);
        res.status(200).json({ done: true });
      } catch (err) {
        console.error("テストメッセージ送信失敗:", err);
        res
          .status(200)
          .json({ done: false, message: err.data?.error || err.message });
      }
    } catch (e) {
      res.status(200).json({ done: false, message: e.message });
    }
  }
);

// Lambdaハンドラ（CDK版）
export const handler = serverless(app);
