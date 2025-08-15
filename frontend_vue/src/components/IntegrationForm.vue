
<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { SlackWorkspace, SlackChannel, IntegrationDetail } from '../api.js';
import { fetchSlackWorkspaces, fetchSlackChannels, fetchIntegrationDetail, updateIntegration, fetchSlackOAuthUrl, addIntegration } from '../api.js';

// --- ワークスペース追加（OAuth認可） ---
async function handleAddWorkspace() {
  try {
    loading.value = true;
    const url = await fetchSlackOAuthUrl();
    window.open(url, '_blank', 'width=600,height=800');
  } catch (e) {
    error.value = 'Slack OAuth URL取得に失敗しました';
  } finally {
    loading.value = false;
  }
}

// --- Props & State ---
const props = defineProps<{
  ProjectId: string;
  mode: string;
}>();

const isEdit = props.mode === 'edit';
 // 通知イベント一覧
const NOTIFICATION_EVENTS = [
  '課題の追加',
  '課題の更新',
  '課題にコメント',
  '課題の削除',
  '課題をまとめて更新',
  'お知らせの追加',
];

const route = useRoute();
const router = useRouter();

// Slack連携の各種状態バインド
const slackWorkspaceId = ref<string>(''); // SlackワークスペースID
const slackChannelId = ref<string>(''); // SlackチャンネルID
const description = ref<string>(''); // 説明
const notificationEvents = ref<IntegrationDetail['notificationEvents']>([]); // 通知イベント

const workspaces = ref<SlackWorkspace[]>([]); // ワークスペース一覧
const channels = ref<SlackChannel[]>([]); // Slackチャンネル一覧
const loading = ref<boolean>(false); // ローディング状態
const error = ref<string|null>(null); // エラーメッセージ
const done = ref<boolean>(false); // 処理完了フラグ
const workspaceLoading = ref<boolean>(false); // ワークスペースローディング状態
const channelLoading = ref<boolean>(false); // チャンネルローディング状態
const disabled = ref<boolean>(false); // フォーム送信ボタンの無効化状態

// --- Util: ワークスペース名取得 ---
function getWorkspaceName(id: string): string {
  const ws = workspaces.value.find((ws: SlackWorkspace) => ws.id === id);
  return ws ? ws.name : id;
}
// --- Util: チャンネル名取得 ---

/**
 * チャンネル名を取得する
 * @param id チャンネルID
 */
function getChannelName(id: string): string {
  const ch = channels.value.find((ch: SlackChannel) => ch.id === id);
  return ch ? ch.name : id;
}

// --- 初期データ取得 ---
onMounted(async () => {
  workspaceLoading.value = true;
  workspaces.value = await fetchSlackWorkspaces();
  workspaceLoading.value = false;
  if (isEdit && route.params.id) {
    const detail = await fetchIntegrationDetail(props.ProjectId, route.params.id as string);
    slackWorkspaceId.value = detail.slackWorkspaceId;
    slackChannelId.value = detail.slackChannelId;
    description.value = detail.description || '';
    notificationEvents.value = detail.notificationEvents || [];
    channelLoading.value = true;
    channels.value = await fetchSlackChannels(detail.slackWorkspaceId);
    channelLoading.value = false;
    disabled.value = true;
  } else {
    disabled.value = false;
  }
});

// --- 新規時のワークスペース選択でチャンネル一覧取得 ---
watch(slackWorkspaceId, async (newWorkspaceId: string) => {
  if (!isEdit && newWorkspaceId) {
    try {
      channelLoading.value = true;
      error.value = null;
      channels.value = await fetchSlackChannels(newWorkspaceId);
    } catch (e) {
      channels.value = [];
      if (typeof e === 'object' && e && 'message' in e) {
        error.value = (e as { message?: string }).message || 'Slackチャンネル取得に失敗しました';
      } else {
        error.value = 'Slackチャンネル取得に失敗しました';
      }
    } finally {
      channelLoading.value = false;
    }
  } else if (!isEdit) {
    channels.value = [];
  }
});

// --- 保存ボタン押下時の処理 ---
async function handleSubmit(): Promise<void> {
  error.value = null;
  done.value = false;
  // バリデーション
  if (!slackWorkspaceId.value) {
    error.value = 'ワークスペースを選択してください';
    return;
  }
  if (!slackChannelId.value) {
    error.value = 'Slackチャネルを選択してください';
    return;
  }
  if (!notificationEvents.value || notificationEvents.value.length === 0) {
    error.value = '通知イベントを1つ以上選択してください';
    return;
  }
  loading.value = true;
  try {
    if (isEdit && route.params.id) {
  await updateIntegration(props.ProjectId, route.params.id as string, {
        description: description.value,
        notificationEvents: notificationEvents.value
      });
      done.value = true;
      router.push('/integrations');
    } else {
      // 新規追加時の処理（React版と同等に実装）
      await addIntegration(props.ProjectId, {
        slackWorkspaceId: slackWorkspaceId.value,
        slackChannelId: slackChannelId.value,
        description: description.value,
        notificationEvents: notificationEvents.value
      });
      done.value = true;
      // 保存完了後は必ず一覧へ遷移
      router.push('/integrations');
    }
  } catch (e: unknown) {
    if (typeof e === 'object' && e && 'message' in e) {
      error.value = (e as { message?: string }).message || '保存に失敗しました';
    } else {
      error.value = '保存に失敗しました';
    }
  } finally {
    loading.value = false;
  }
}

// --- キャンセルボタン押下時の処理 ---
function handleCancel(): void {
  router.push('/integrations');
}
</script>

<template>
  <div>
    <h2>{{ isEdit ? 'Slack連携編集' : '新規Slack連携追加' }}</h2>
    <form @submit.prevent="handleSubmit">
      <div>
        <label>ワークスペース: </label>
        <span v-if="isEdit">
          {{ getWorkspaceName(slackWorkspaceId) }}
        </span>
        <span v-else-if="workspaceLoading">取得中...</span>
        <template v-else>
          <select v-model="slackWorkspaceId" :disabled="disabled">
            <option value="">--選択--</option>
            <option v-for="workspace in workspaces" :key="workspace.id" :value="workspace.id">
              {{ workspace.name }}
            </option>
          </select>
          <button type="button" @click="handleAddWorkspace" :disabled="disabled" style="margin-left:8px;">
            ワークスペースを追加
          </button>
        </template>
      </div>
      <div>
        <label>Slackチャネル: </label>
        <span v-if="isEdit">
          {{ getChannelName(slackChannelId) }}
        </span>
        <span v-else-if="channelLoading">取得中...</span>
        <select v-else v-model="slackChannelId" :disabled="!slackWorkspaceId">
          <option value="">--選択--</option>
          <option v-for="channel in channels" :key="channel.id" :value="channel.id">
            {{ channel.name }}
          </option>
        </select>
      </div>
      <div>
        <label>説明: </label>
        <textarea v-model="description" />
      </div>
      <div>
        <label>通知イベント（現在未実装・・・）: </label><br />
        <label v-for="ev in NOTIFICATION_EVENTS" :key="ev" style="margin-right:8px;">
          <input type="checkbox" :value="ev" v-model="notificationEvents" />
          {{ ev }}
        </label>
      </div>
      <button type="submit" :disabled="loading">保存</button>
      <button type="button" @click="handleCancel">キャンセル</button>
    </form>
    <div v-if="loading">処理中...</div>
    <div v-if="error" style="color: red;">エラー: {{ error }}</div>
    <div v-if="done" style="color: green;">処理が完了しました</div>
  </div>
</template>
