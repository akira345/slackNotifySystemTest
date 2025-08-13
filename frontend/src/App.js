// App.js
// アプリケーションのメインコンポーネント。ルーティングとAPIラッパーを提供
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import IntegrationList from './components/IntegrationList';
import IntegrationForm from './components/IntegrationForm';
// APIベースURL（.envのREACT_APP_API_BASE_URLを利用、なければデフォルト値）
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://example.execute-api.ap-northeast-1.amazonaws.com/dev/';

// API呼び出し用ラッパー関数
export async function fetchWithSpinnerAndDialog(url, options, setLoading, setError, setDone) {
  setLoading(true);
  setError(null);
  setDone(false);
  try {
    const res = await fetch(`${API_BASE_URL}${url}`, options);
    const data = await res.json();
    if (!data.done) throw new Error(data.message || 'APIエラー');
    setDone(true);
    return data;
  } catch (e) {
    setError(e.message);
    throw e;
  } finally {
    setLoading(false);
  }
}
// 検証目的なのでプロジェクトIDは固定
const ProjectId = 'TESTPRJ';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/integrations" element={<IntegrationList ProjectId={ProjectId} />} />
        <Route path="/integrations/new" element={<IntegrationForm mode="new" ProjectId={ProjectId} />} />
        <Route path="/integrations/:id/edit" element={<IntegrationForm mode="edit" ProjectId={ProjectId} />} />
        <Route path="*" element={<Navigate to="/integrations" />} />
      </Routes>
    </Router>
  );
}

export default App;
