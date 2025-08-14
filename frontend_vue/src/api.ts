// api.ts
// Slack OAuth連携・ワークスペース/チャンネル/連携情報取得・編集用APIラッパー

const API_BASE_URL: string = (import.meta.env.VITE_API_BASE_URL || 'https://example.execute-api.ap-northeast-1.amazonaws.com/dev/').replace(/\/?$/, '/');

/**
 * 共通fetchラッパー（done判定・jsonパースのみ）
 */
async function apiFetch(path: string, { method = 'GET', body = null }: { method?: string, body?: any } = {}): Promise<any> {
  const res = await fetch(`${API_BASE_URL}${path.replace(/^\//, '')}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {})
  });
  const data = await res.json();
  if (!data.done) throw new Error(data.message || 'APIエラー');
  return data;
}

// 共通APIレスポンス型
export type ApiResponse<T> = {
  done: boolean;
  data?: T;
  message?: string;
  url?: string;
};

// 連携情報（一覧・詳細共通）
export type Integration = {
  integrationId: string;
  name: string;
  description: string;
  notificationEvents: string[];
  slackChannelName: string;
  slackWorkspaceName: string;
};

// 連携詳細（fetchIntegrationDetailのdata用、IDなど追加情報あり）
export type IntegrationDetail = {
  ProjectId: string;
  integrationId: string;
  name: string;
  description: string;
  notificationEvents: string[];
  slackChannelId: string;
  slackWorkspaceId: string;
};

export type SlackWorkspace = {
  id: string;
  name: string;
};
export type SlackChannel = {
  id: string;
  name: string;
};

/**
 * Slackワークスペース一覧を取得
 * @returns SlackWorkspace[]
 */
export async function fetchSlackWorkspaces(): Promise<SlackWorkspace[]> {
  const res: ApiResponse<SlackWorkspace[]> = await apiFetch('slack/oauth/workspaces');
  return res.data || [];
}

/**
 * Slack OAuth認証用URLを取得
 * @returns 認証URL文字列
 */
export async function fetchSlackOAuthUrl(): Promise<string> {
  const res: ApiResponse<never> & { url: string } = await apiFetch('slack/oauth/url');
  return res.url;
}

/**
 * 指定ワークスペースのSlackチャンネル一覧を取得
 * @param workspaceId ワークスペースID
 * @returns SlackChannel[]
 */
export async function fetchSlackChannels(workspaceId: string): Promise<SlackChannel[]> {
  const res: ApiResponse<SlackChannel[]> = await apiFetch(`slack/oauth/channels?workspaceId=${encodeURIComponent(workspaceId)}`);
  return res.data || [];
}

/**
 * 指定プロジェクト・連携IDの詳細情報を取得
 * @param projectId プロジェクトID
 * @param integrationId 連携ID
 * @returns 連携詳細データ
 */
export async function fetchIntegrationDetail(projectId: string, integrationId: string): Promise<IntegrationDetail> {
  const res: ApiResponse<IntegrationDetail> = await apiFetch(`projects/${projectId}/integrations/${integrationId}`, { method: 'POST', body: {} });
  return res.data!;
}

/**
 * 既存連携情報を更新
 * @param projectId プロジェクトID
 * @param integrationId 連携ID
 * @param body 更新内容
 * @returns APIレスポンス
 */
export async function updateIntegration(projectId: string, integrationId: string, body: Partial<IntegrationDetail>): Promise<IntegrationDetail> {
  const res: ApiResponse<IntegrationDetail> = await apiFetch(`projects/${projectId}/integrations/${integrationId}/edit`, { method: 'POST', body });
  return res.data!;
}

/**
 * 新規連携を追加
 * @param projectId プロジェクトID
 * @param body 追加内容
 * @returns APIレスポンス
 */
export async function addIntegration(projectId: string, body: Partial<IntegrationDetail>): Promise<IntegrationDetail> {
  const res: ApiResponse<IntegrationDetail> = await apiFetch(`projects/${projectId}/integrations/add`, { method: 'POST', body });
  return res.data!;
}

/**
 * プロジェクト内の全連携一覧を取得
 * @param projectId プロジェクトID
 * @returns 連携一覧
 */
export async function fetchIntegrations(projectId: string): Promise<Integration[]> {
  const res: ApiResponse<Integration[]> = await apiFetch(`projects/${projectId}/integrations`, { method: 'POST', body: {} });
  return res.data || [];
}

/**
 * 連携を削除
 * @param projectId プロジェクトID
 * @param integrationId 連携ID
 * @returns APIレスポンス
 */
export async function deleteIntegration(projectId: string, integrationId: string): Promise<{ done: boolean }> {
  const res: ApiResponse<null> = await apiFetch(`projects/${projectId}/integrations/${integrationId}/delete`, { method: 'POST', body: {} });
  return { done: res.done };
}

/**
 * 連携のテストメッセージ送信
 * @param projectId プロジェクトID
 * @param integrationId 連携ID
 * @returns APIレスポンス
 */
export async function testIntegration(projectId: string, integrationId: string): Promise<{ done: boolean }> {
  const res: ApiResponse<null> = await apiFetch(`projects/${projectId}/integrations/${integrationId}/test`, { method: 'POST', body: {} });
  return { done: res.done };
}
