
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Viteのホットリロード（HMR: Hot Module Replacement）はデフォルトで有効です。
// 下記のserver.watch.usePollingやserver.hostの設定は、特定の環境（WSLや仮想環境など）でHMRが効かない場合の対策です。
// - usePolling: true → ファイル監視をポーリング方式にし、HMRの検知精度を上げる
// - host: true → LANや仮想環境からのアクセスを許可

// HMRの詳細: https://vitejs.dev/config/server-options.html#server-hmr

export default defineConfig({
  plugins: [vue()],
  server: {
    watch: {
      usePolling: true, // HMRが効かない場合の対策
    },
    host: true, // WSLや仮想環境でのHMR対策
  },
})
