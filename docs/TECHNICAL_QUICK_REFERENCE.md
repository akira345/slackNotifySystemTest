# 技術仕様クイックリファレンス

## 🎯 実装済み最適化

### aws-lambda-nodejs + esbuild

- **Runtime**: Node.js 22, x86_64
- **Format**: ES Modules (`OutputFormat.ESM`)
- **Optimization**: minify + tree shaking + source maps
- **External**: `@aws-sdk/*` (Lambda Layer活用)

### 高レベルコンストラクト

- `LambdaRestApi` → 自動API Gateway統合
- `PolicyStatement` → IAM簡素化
- LogGroup factory → 統一ログ管理

### Cross-Stack分離

- `DataStack`: DynamoDB (永続化層)
- `ApiStack`: Lambda + API Gateway (アプリ層)
- Cross-reference: `tableArn` + `tableName`

## 🏗️ アーキテクチャ概要

```text
Frontend ──▶ BackendApi (LambdaRestApi)
             │
Slack OAuth ──▶ OAuthApi (LambdaRestApi)  
             │
Slack Bot ──▶ SlackBotApi (LambdaRestApi)
             │
             ▼
         DynamoDB (DataStack)
```

## 🔧 設定管理

### 環境別設定

```json
// cdkconfig.{env}.json
{
  "DYNAMODB_REGION": "ap-northeast-1",
  "SLACK_CLIENT_ID": "...",
  "SLACK_CLIENT_SECRET": "...",
  "SLACK_SIGNING_SECRET": "...",
  "SLACK_REDIRECT_URI": "...",
  "SLACK_STATE_SECRET": "...",
  "SLACK_BOT_TOKEN": "..."
}
```

### gitignore重要項目

```gitignore
# 認証情報除外
backend-cdk/config/cdkconfig.json
backend-cdk/config/cdkconfig.dev.json
backend-cdk/config/cdkconfig.prod.json

# ビルド成果物除外
**/cdk.out/
**/dist/
```

## ⚡ esbuild最適化設定

```typescript
bundling: {
  minify: true,           // 本番最適化
  sourceMap: true,        // デバッグ用
  target: 'node22',       // 最新Node.js
  format: OutputFormat.ESM, // ES Modules
  esbuildArgs: {
    '--platform': 'node',
    '--tree-shaking': true,
    '--keep-names': true,
  },
  externalModules: ['@aws-sdk/*'], // 外部化
}
```

## 🚀 デプロイコマンド

```bash
# 開発環境
cdk deploy --context env=dev

# 本番環境
cdk deploy --context env=prod

# スタック個別
cdk deploy DataStack --context env=dev
cdk deploy ApiStack --context env=dev
```

## 🔒 IAM設定

```typescript
// DynamoDB最小権限
actions: [
  'dynamodb:Query',
  'dynamodb:GetItem', 
  'dynamodb:PutItem',
  'dynamodb:DeleteItem',
  'dynamodb:Scan',
],
resources: [
  tableArn,
  `${tableArn}/index/*`,  // GSI対応
]
```

## 📊 出力URL例

- **BackendApi**: `https://xxx.execute-api.ap-northeast-1.amazonaws.com/prod/`
- **OAuthApi**: `https://yyy.execute-api.ap-northeast-1.amazonaws.com/prod/`
- **SlackBotApi**: `https://zzz.execute-api.ap-northeast-1.amazonaws.com/prod/`

## ⚠️ 重要な設計決定

1. **3つのAPI Gateway分離** → セキュリティ・スケーラビリティ
2. **ES Modules採用** → esbuild最適化
3. **Cross-Stack分離** → データ保護・デプロイ柔軟性
4. **高レベルコンストラクト** → コード簡素化

## 🐛 トラブルシューティング

### ES Modules問題

```json
// lambda/*/package.json
{
  "type": "module"
}
```

### Cross-Stack参照エラー

1. DataStack先行デプロイ
2. ARN/名前の正確な受け渡し確認

### esbuild問題

- `externalModules`設定確認
- Lambda Layer活用

---

**ステータス**: ✅ 最適化完了  
**最終更新**: 2025年7月18日
