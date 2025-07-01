// slack_scopes.js
// Slack アプリケーションで使用するスコープ定義
// SAM移行版: 共有設定ファイル

export const SLACK_SCOPES = [
  "channels:read",     // チャンネル情報の読み取り
  "chat:write",        // メッセージの送信
  "team:read",         // ワークスペース情報の読み取り
  "users:read",        // ユーザー情報の読み取り
  "incoming-webhook",  // Webhookの使用（後方互換性のため）
];
