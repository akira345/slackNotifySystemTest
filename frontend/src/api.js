// api.js
// Slack OAuth連携・ワークスペース取得用APIラッパー

// APIベースURL
// .envファイルのREACT_APP_API_BASE_URLを利用（なければデフォルト値）
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://example.execute-api.ap-northeast-1.amazonaws.com/dev/';

// 承認済みワークスペース一覧を取得
export async function fetchSlackWorkspaces() {
  const res = await fetch(`${API_BASE_URL}/slack/oauth/workspaces`);
  const data = await res.json();
  if (!data.done) throw new Error(data.message || 'APIエラー');
  // id, name形式で返る
  return data.data || [];
}

// OAuth認可URL取得
export async function fetchSlackOAuthUrl() {
  const res = await fetch(`${API_BASE_URL}/slack/oauth/url`);
  const data = await res.json();
  if (!data.done) throw new Error(data.message || 'APIエラー');
  return data.url;
}

// 選択ワークスペースのチャンネル一覧を取得
export async function fetchSlackChannels(workspaceId) {
  const res = await fetch(`${API_BASE_URL}/slack/oauth/channels?workspaceId=${encodeURIComponent(workspaceId)}`);
  const data = await res.json();
  if (!data.done) throw new Error(data.message || 'APIエラー');
  return data.data || [];
}
