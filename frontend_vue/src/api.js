
// api.js
// Slack OAuth連携・ワークスペース/チャンネル/連携情報取得・編集用APIラッパー

// APIベースURL（.envのVITE_API_BASE_URLを利用、なければデフォルト値）
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://example.execute-api.ap-northeast-1.amazonaws.com/dev/';


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


// プロジェクトのSlack連携一覧を取得
export async function fetchIntegrations(projectId) {
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}/integrations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  const data = await res.json();
  if (!data.done) throw new Error(data.message || 'APIエラー');
  return data.data || [];
}


// 個別のSlack連携詳細を取得
export async function fetchIntegrationDetail(projectId, integrationId) {
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}/integrations/${integrationId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  const data = await res.json();
  if (!data.done) throw new Error(data.message || 'APIエラー');
  return data.data;
}


// Slack連携の編集（更新）
export async function updateIntegration(projectId, integrationId, body) {
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}/integrations/${integrationId}/edit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!data.done) throw new Error(data.message || 'APIエラー');
  return data.data;
}
