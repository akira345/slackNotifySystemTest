
// api.js
// Slack OAuth連携・ワークスペース/チャンネル/連携情報取得・編集用APIラッパー

// APIベースURL（.envのVITE_API_BASE_URLを利用、なければデフォルト値）
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'https://example.execute-api.ap-northeast-1.amazonaws.com/dev/').replace(/\/?$/, '/');

/**
 * 共通fetchラッパー（done判定・jsonパースのみ）
 * @param {string} path - APIパス（先頭スラッシュ不要）
 * @param {Object} [options] - fetchオプション
 * @param {string} [options.method='GET'] - HTTPメソッド（GET/POST/PUT/DELETE等）。省略時はGET。
 * @param {Object|string|null} [options.body] - リクエストボディ。オブジェクトの場合はJSON.stringifyされる。GET等では通常不要。
 * @returns {Promise<any>} APIレスポンス全体（done, data, url, message等を含む）
 * @throws {Error} APIエラー時（done=falseの場合）
 */
async function apiFetch(path, { method = 'GET', body = null } = {}) {
  const res = await fetch(`${API_BASE_URL}${path.replace(/^\//, '')}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {})
  });
  const data = await res.json();
  if (!data.done) throw new Error(data.message || 'APIエラー');
  return data;
}

/**
 * 承認済みワークスペース一覧取得
 * @returns {Promise<Array<{id: string, name: string}>>}
 */
export async function fetchSlackWorkspaces() {
  const res = await apiFetch('slack/oauth/workspaces');
  return res.data || [];
}

/**
 * Slack OAuth認可URL取得
 * @returns {Promise<string>} 認可URL
 */
export async function fetchSlackOAuthUrl() {
  const res = await apiFetch('slack/oauth/url');
  return res.url;
}

/**
 * 選択ワークスペースのチャンネル一覧取得
 * @param {string} workspaceId
 * @returns {Promise<Array<{id: string, name: string}>>}
 */
export async function fetchSlackChannels(workspaceId) {
  const res = await apiFetch(`slack/oauth/channels?workspaceId=${encodeURIComponent(workspaceId)}`);
  return res.data || [];
}

/**
 * プロジェクトのSlack連携一覧取得
 * @param {string} projectId
 * @returns {Promise<Array>} 連携一覧
 */
export async function fetchIntegrations(projectId) {
  const res = await apiFetch(`projects/${projectId}/integrations`, { method: 'POST', body: {} });
  return res.data || [];
}

/**
 * 個別のSlack連携詳細取得
 * @param {string} projectId
 * @param {string} integrationId
 * @returns {Promise<Object>} 連携詳細
 */
export async function fetchIntegrationDetail(projectId, integrationId) {
  const res = await apiFetch(`projects/${projectId}/integrations/${integrationId}`, { method: 'POST', body: {} });
  return res.data;
}

/**
 * Slack連携の編集（更新）
 * @param {string} projectId
 * @param {string} integrationId
 * @param {Object} body
 * @returns {Promise<Object>} 更新後データ
 */
export async function updateIntegration(projectId, integrationId, body) {
  const res = await apiFetch(`projects/${projectId}/integrations/${integrationId}/edit`, { method: 'POST', body });
  return res.data;
}

/**
 * Slack連携の削除
 * @param {string} projectId
 * @param {string} integrationId
 * @returns {Promise<Object>} 削除結果
 */
export async function deleteIntegration(projectId, integrationId) {
  const res = await apiFetch(`projects/${projectId}/integrations/${integrationId}/delete`, { method: 'POST', body: {} });
  return res.data;
}

/**
 * Slack連携のテスト送信
 * @param {string} projectId
 * @param {string} integrationId
 * @returns {Promise<Object>} テスト送信結果
 */
export async function testIntegration(projectId, integrationId) {
  const res = await apiFetch(`projects/${projectId}/integrations/${integrationId}/test`, { method: 'POST', body: {} });
  return res.data;
}

/**
 * Slack連携の新規追加
 * @param {string} projectId
 * @param {Object} body
 * @returns {Promise<Object>} 追加結果
 */
export async function addIntegration(projectId, body) {
  const res = await apiFetch(`projects/${projectId}/integrations/add`, { method: 'POST', body });
  return res.data;
}
