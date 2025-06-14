// IntegrationForm.js
// Slack連携の新規追加・編集フォーム
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchWithSpinnerAndDialog } from '../App';
import { fetchSlackWorkspaces, fetchSlackOAuthUrl, fetchSlackChannels } from '../api';

// Slack通知するイベント設定の例
// 今回は未実装
const NOTIFICATION_EVENTS = [
  '課題の追加',
  '課題の更新',
  '課題にコメント',
  '課題の削除',
  '課題をまとめて更新',
  'お知らせの追加',
];

function IntegrationForm({ mode, ProjectId }) {
  const { id } = useParams();
  const [slackWorkspaceId, setSlackWorkspaceId] = useState('');
  const [slackChannelId, setSlackChannelId] = useState('');
  const [description, setDescription] = useState('');
  const [notificationEvents, setNotificationEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [workspaces, setWorkspaces] = useState([]);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [channels, setChannels] = useState([]);
  const [channelLoading, setChannelLoading] = useState(false);
  const navigate = useNavigate();

  // 編集時は初期値取得
  useEffect(() => {
    if (mode === 'edit' && id) {
      setDone(false); // 初期化時にdoneをリセット
      fetchWithSpinnerAndDialog(
        `/projects/${ProjectId}/integrations/${id}`,
        { method: 'POST', body: JSON.stringify({}) },
        setLoading, setError, () => {}
      ).then(data => {
        setSlackWorkspaceId(data.data.slackWorkspaceId);
        setSlackChannelId(data.data.slackChannelId);
        setDescription(data.data.description || '');
        setNotificationEvents(data.data.notificationEvents || []);
        setDisabled(true);
      }).catch(() => {});
    }
  }, [mode, id, ProjectId]);

  // 編集時もワークスペース・チャネル名を取得
  useEffect(() => {
    if (mode === 'edit' && slackWorkspaceId) {
      fetchSlackWorkspaces()
        .then(ws => setWorkspaces(ws))
        .catch(() => setWorkspaces([]));
    }
  }, [mode, slackWorkspaceId]);

  useEffect(() => {
    if (mode === 'edit' && slackWorkspaceId && slackChannelId) {
      fetchSlackChannels(slackWorkspaceId)
        .then(chs => setChannels(chs))
        .catch(() => setChannels([]));
    }
  }, [mode, slackWorkspaceId, slackChannelId]);

  // ワークスペース一覧取得
  useEffect(() => {
    if (mode === 'new') {
      setWorkspaceLoading(true);
      fetchSlackWorkspaces()
        .then(ws => setWorkspaces(ws))
        .catch(() => setWorkspaces([]))
        .finally(() => setWorkspaceLoading(false));
    }
  }, [mode]);

  // ワークスペース選択
  const handleSelectWorkspace = async () => {
    setLoading(true);
    try {
      const url = await fetchSlackOAuthUrl();
      // ポップアップでOAuth画面を開く
      window.open(url, '_blank', 'width=600,height=800');
    } catch (e) {
      setError('Slack OAuth URL取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };
  // チャンネル選択
  const handleSelectChannel = (e) => {
    setSlackChannelId(e.target.value);
  };

  // イベント選択
  const handleEventChange = (event) => {
    const value = event.target.value;
    setNotificationEvents(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  // 送信
  const handleSubmit = async (e) => {
    e.preventDefault();
    // 必須チェック
    if (!slackWorkspaceId) {
      setError('ワークスペースを選択してください');
      return;
    }
    if (!slackChannelId) {
      setError('Slackチャネルを選択してください');
      return;
    }
    if (!notificationEvents || notificationEvents.length === 0) {
      setError('通知イベントを1つ以上選択してください');
      return;
    }
    const body = {
      slackWorkspaceId,
      slackChannelId,
      description, // 説明のみ任意
      notificationEvents,
    };
    if (mode === 'new') {
      const result = await fetchWithSpinnerAndDialog(
        `/projects/${ProjectId}/integrations/add`,
        { method: 'POST', body: JSON.stringify(body) },
        setLoading, setError, setDone
      );
      // 新規追加後、integrationIdが返ってきたら編集画面へ遷移（または一覧へ）
      if (result && result.data && result.data.integrationId) {
        navigate(`/integrations/${result.data.integrationId}/edit`);
      } else {
        navigate('/integrations');
      }
    } else {
      await fetchWithSpinnerAndDialog(
        `/projects/${ProjectId}/integrations/${id}/edit`,
        { method: 'POST', body: JSON.stringify(body) },
        setLoading, setError, setDone
      );
      setDone(true); // 編集時はここでdoneをtrueに
      navigate('/integrations');
    }
  };

  // ワークスペース選択時にチャンネル一覧取得
  useEffect(() => {
    if (slackWorkspaceId && mode !== 'edit') {
      setChannelLoading(true);
      fetchSlackChannels(slackWorkspaceId)
        .then(chs => setChannels(chs))
        .catch(() => setChannels([]))
        .finally(() => setChannelLoading(false));
    } else {
      setChannels([]);
    }
  }, [slackWorkspaceId, mode]);

  return (
    <div>
      <h2>{mode === 'new' ? '新規Slack連携追加' : 'Slack連携編集'}</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>ワークスペース: </label>
          {mode === 'edit' ? (
            <span>{workspaces.find(ws => ws.id === slackWorkspaceId)?.name || slackWorkspaceId}</span>
          ) : workspaceLoading ? (
            <span>取得中...</span>
          ) : (
            <>
              <select
                value={slackWorkspaceId}
                onChange={e => setSlackWorkspaceId(e.target.value)}
                disabled={disabled}
              >
                <option value="">--選択--</option>
                {workspaces.map(ws => (
                  <option key={ws.id} value={ws.id}>{ws.name}</option>
                ))}
              </select>
              <button type="button" onClick={handleSelectWorkspace} disabled={disabled}>
                ワークスペースを追加
              </button>
            </>
          )}
          {slackWorkspaceId && mode !== 'edit' && <span style={{marginLeft:8}}>選択済: {slackWorkspaceId}</span>}
        </div>
        <div>
          <label>Slackチャネル: </label>
          {mode === 'edit' ? (
            <span>{channels.find(ch => ch.id === slackChannelId)?.name || slackChannelId}</span>
          ) : channelLoading ? (
            <span>取得中...</span>
          ) : (
            <select value={slackChannelId} onChange={handleSelectChannel} disabled={disabled || !slackWorkspaceId}>
              <option value="">--選択--</option>
              {channels.map(ch => (
                <option key={ch.id} value={ch.id}>{ch.name}</option>
              ))}
            </select>
          )}
        </div>
        <div>
          <label>説明: </label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        <div>
          <label>通知イベント（現在未実装・・・）: </label><br />
          {NOTIFICATION_EVENTS.map(ev => (
            <label key={ev} style={{ marginRight: 8 }}>
              <input
                type="checkbox"
                value={ev}
                checked={notificationEvents.includes(ev)}
                onChange={handleEventChange}
              />
              {ev}
            </label>
          ))}
        </div>
        <button type="submit" disabled={loading}>保存</button>
        <button type="button" onClick={() => navigate('/integrations')}>キャンセル</button>
      </form>
      {loading && <div>処理中...</div>}
      {error && <div style={{ color: 'red' }}>エラー: {error}</div>}
      {done && <div style={{ color: 'green' }}>処理が完了しました</div>}
    </div>
  );
}

export default IntegrationForm;
