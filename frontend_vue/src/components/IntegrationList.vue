
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { fetchIntegrations, deleteIntegration as apiDeleteIntegration, testIntegration as apiTestIntegration } from '../api.js';

const props = defineProps<{
  ProjectId: string;
}>();

const router = useRouter();
import type { Integration } from '../api';
const integrations = ref<Integration[]>([]); // Slack連携の一覧
const loading = ref<boolean>(true); // ローディング状態
const done = ref<boolean>(false); // 処理完了フラグ
const error = ref<string|null>(null); // 

/**
 * Slack連携の一覧を取得する
 */
async function loadIntegrations(): Promise<void> {
  loading.value = true;
  done.value = false;
  error.value = null;
  try {
    integrations.value = await fetchIntegrations(props.ProjectId);
    done.value = true;
  } catch (e: unknown) {
    integrations.value = [];
    if (typeof e === 'object' && e && 'message' in e) {
      error.value = (e as { message?: string }).message || 'データ取得エラー';
    } else {
      error.value = 'データ取得エラー';
    }
  } finally {
    loading.value = false;
  }
}

// 初期データ取得
onMounted(loadIntegrations);

function editIntegration(id: string): void {
  router.push(`/integrations/${id}/edit`);
}

// 削除API呼び出し
async function deleteIntegration(id: string): Promise<void> {
  if (!window.confirm('本当に削除しますか?')) return;
  error.value = null;
  try {
    loading.value = true;
    done.value = false;
    await apiDeleteIntegration(props.ProjectId, id);
    await loadIntegrations();
    done.value = true;
  } catch (e: unknown) {
    if (typeof e === 'object' && e && 'message' in e) {
      error.value = (e as { message?: string }).message || '削除に失敗しました';
      window.alert('削除に失敗しました: ' + ((e as { message?: string }).message || 'エラー'));
    } else {
      error.value = '削除に失敗しました';
      window.alert('削除に失敗しました: エラー');
    }
  } finally {
    loading.value = false;
  }
}

// テスト送信API呼び出し
async function testIntegration(id: string): Promise<void> {
  error.value = null;
  try {
    loading.value = true;
    done.value = false;
    await apiTestIntegration(props.ProjectId, id);
    window.alert('テストメッセージを送信しました');
    done.value = true;
  } catch (e: unknown) {
    if (typeof e === 'object' && e && 'message' in e) {
      error.value = (e as { message?: string }).message || 'テストメッセージ送信に失敗しました';
      window.alert('テストメッセージ送信に失敗しました: ' + ((e as { message?: string }).message || 'エラー'));
    } else {
      error.value = 'テストメッセージ送信に失敗しました';
      window.alert('テストメッセージ送信に失敗しました: エラー');
    }
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div>
    <h2>Slack連携一覧</h2>
    <button @click="$router.push('/integrations/new')">新規追加</button>
  <div v-if="error" style="color: red;">エラー: {{ error }}</div>
  <div v-if="done" style="color: green;">処理が完了しました</div>
    <div v-if="loading" style="margin-bottom:8px;">読み込み中...</div>
    <div v-if="integrations.length === 0 && !loading">データがありません。</div>
    <div v-if="integrations.length > 0">
      <table border="1" cellPadding="4">
        <thead>
          <tr>
            <th>Slackチャネル名</th>
            <th>ワークスペース名</th>
            <th>説明</th>
            <th>通知イベント</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="integration in integrations" :key="integration.integrationId">
            <td>{{ integration.slackChannelName }}</td>
            <td>{{ integration.slackWorkspaceName }}</td>
            <td>{{ integration.description }}</td>
            <td>{{ (integration.notificationEvents || []).join(', ') }}</td>
            <td>
              <button @click="editIntegration(integration.integrationId)">編集</button>
              <button @click="deleteIntegration(integration.integrationId)">削除</button>
              <button @click="testIntegration(integration.integrationId)">テスト送信</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
