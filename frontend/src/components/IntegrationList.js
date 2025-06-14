// IntegrationList.js
// Slack連携の一覧表示・削除・編集画面
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithSpinnerAndDialog } from '../App';

function IntegrationList({ ProjectId }) {
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  // 一覧取得
  const fetchIntegrations = () => {
    fetchWithSpinnerAndDialog(
      `/projects/${ProjectId}/integrations`,
      { method: 'POST', body: JSON.stringify({}) },
      setLoading, setError, setDone
    ).then(data => setIntegrations(data.data)).catch(() => {});
  };

  useEffect(() => {
    fetchIntegrations();
  }, [ProjectId]);

  // 削除処理
  const handleDelete = async (integrationId) => {
    if (!window.confirm('本当に削除しますか？')) return;
    await fetchWithSpinnerAndDialog(
      `/projects/${ProjectId}/integrations/${integrationId}/delete`,
      { method: 'POST', body: JSON.stringify({}) },
      setLoading, setError, setDone
    );
    fetchIntegrations(); // 削除後に明示的に再取得
  };

  // テストメッセージ送信
  const handleTest = async (integrationId) => {
    try {
      await fetchWithSpinnerAndDialog(
        `/projects/${ProjectId}/integrations/${integrationId}/test`,
        { method: 'POST', body: JSON.stringify({}) },
        setLoading, setError, setDone
      );
      window.alert('テストメッセージを送信しました');
    } catch (e) {
      window.alert('テストメッセージ送信に失敗しました: ' + (e.message || 'エラー'));
    }
  };

  return (
    <div>
      <h2>Slack連携一覧</h2>
      <button onClick={() => navigate('/integrations/new')}>新規追加</button>
      {loading && <div>読み込み中...</div>}
      {error && <div style={{ color: 'red' }}>エラー: {error}</div>}
      {done && <div style={{ color: 'green' }}>処理が完了しました</div>}
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
          {integrations.map(i => (
            <tr key={i.integrationId}>
              <td>{i.slackChannelName}</td>
              <td>{i.slackWorkspaceName}</td>
              <td>{i.description}</td>
              <td>{(i.notificationEvents || []).join(', ')}</td>
              <td>
                <button onClick={() => navigate(`/integrations/${i.integrationId}/edit`)}>編集</button>
                <button onClick={() => handleDelete(i.integrationId)}>削除</button>
                <button onClick={() => handleTest(i.integrationId)}>テスト送信</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default IntegrationList;
