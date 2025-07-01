# AWS CDK版 Slack Integration Backend

このディレクトリには、Slack連携技術検証システムのAWS CDK版が含まれています。
元のServerless FrameworkからAWS CDKに移行し、TypeScriptでインフラ定義を行う実装です。

## 前提条件

- Node.js 22以上
- AWS CDK CLI (`npm install -g aws-cdk`)
- AWS CLI設定済み
- TypeScript基本知識

## ディレクトリ構造

```
backend-cdk/
├── bin/                         # CDKアプリケーションエントリポイント
│   └── slack-integration.ts
├── lib/                         # CDKスタック定義
│   ├── slack-integration-stack.ts
│   └── dynamodb.ts
├── lambda/                      # Lambda関数コード（元のプロジェクトからコピー）
├── config/                      # 設定ファイル
│   ├── cdkconfig.dev.example.json    # 開発環境設定例
│   ├── cdkconfig.prod.example.json   # 本番環境設定例
│   ├── cdkconfig.dev.json       # 開発環境設定（gitignore対象）
│   └── cdkconfig.prod.json      # 本番環境設定（gitignore対象）
├── cdk.json                     # CDK設定
├── package.json                 # 依存関係
├── tsconfig.json               # TypeScript設定
└── README.md                    # このファイル
```

## セットアップ

### 1. 依存関係のインストール

```bash
cd backend-cdk
npm install
```

### 2. 設定ファイルの準備

```bash
# 開発環境設定
cp config/cdkconfig.dev.example.json config/cdkconfig.dev.json

# 本番環境設定  
cp config/cdkconfig.prod.example.json config/cdkconfig.prod.json

# 各ファイルを編集してSlackアプリの実際の情報を設定
```

設定ファイル例（`cdkconfig.dev.json`）：

```json
{
  "dev": {
    "stackName": "SlackNotifySystemDev",
    "environment": {
      "DYNAMODB_TABLE": "SlackIntegrations-dev",
      "DYNAMODB_REGION": "ap-northeast-1",
      "SLACK_CLIENT_ID": "your_slack_client_id_here",
      "SLACK_CLIENT_SECRET": "your_slack_client_secret_here", 
      "SLACK_SIGNING_SECRET": "your_slack_signing_secret_here",
      "SLACK_REDIRECT_URI": "https://your-dev-api-gateway-url/oauth/callback",
      "SLACK_STATE_SECRET": "your_state_secret_here",
      "SLACK_BOT_TOKEN": "your_slack_bot_token_here"
    }
  }
}
```

### 3. CDKの初期化（初回のみ）

```bash
cdk bootstrap --profile <PROFILE_NAME>
```

### 4. ビルドとデプロイ

```bash
# TypeScriptのコンパイル
npm run build

# 開発環境へのデプロイ
cdk deploy --context env=dev

# 本番環境へのデプロイ
cdk deploy --context env=prod

# デプロイ前の差分確認
cdk diff --context env=dev

# スタック削除
cdk destroy --context env=dev
```

#### 例：特定のAWSプロファイルを使用する場合

```bash
# 開発環境デプロイ
cdk deploy --context env=dev --profile MyAWS

# 本番環境デプロイ
cdk deploy --context env=prod --profile MyAWS
```

## 設定管理

このCDK版では、環境別のJSONファイルで設定を管理します：

### 設定ファイル構成

- **`config/cdkconfig.dev.example.json`** - 開発環境のサンプル設定
- **`config/cdkconfig.prod.example.json`** - 本番環境のサンプル設定
- **`config/cdkconfig.dev.json`** - 開発環境の実際の設定（gitignore対象）
- **`config/cdkconfig.prod.json`** - 本番環境の実際の設定（gitignore対象）

### 特徴

- **型安全性**: TypeScriptによる型チェック
- **環境分離**: 環境別設定ファイルによる完全な分離
- **AWSネイティブ**: CloudFormationベースのインフラ定義
- **豊富な制御**: AWS CDKの豊富なコンストラクトを活用

## 機能

### Lambda関数

1. **API Function** (`lambda/api/`)
   - メインのSlack Integration API
   - 統合管理、通知送信等
   - エンドポイント: `/{proxy+}`

2. **OAuth Function** (`lambda/oauth/`)
   - SlackワークスペースのOAuth認証
   - ワークスペース・チャンネル管理
   - エンドポイント: `/slack/oauth/{proxy+}`

3. **SlackBot Function** (`lambda/slackbot/`)
   - Slack Bolt使用のSlackアプリ
   - イベント処理
   - エンドポイント: `/slack/events`

### AWS リソース

- **API Gateway**: REST API
- **DynamoDB**: データストレージ（Pay-per-request）
- **CloudWatch Logs**: ログ管理（7日間保持）
- **IAM**: 最小権限のロール

## トラブルシューティング

### よくある問題

1. **ビルドエラー**

   ```bash
   # TypeScriptコンパイルエラーの確認
   npm run build
   
   # 依存関係のクリーンインストール
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **デプロイエラー**

   ```bash
   # CDK設定の確認
   cdk doctor
   
   # 詳細ログでデプロイ
   cdk deploy --context env=dev --verbose
   ```

3. **設定ファイル不存在**

   ```bash
   cp config/cdkconfig.dev.example.json config/cdkconfig.dev.json
   ```

### ログ確認

```bash
# CloudWatch Logsでログを確認
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/SlackNotifySystem"

# 特定のLambda関数のログ
aws logs tail /aws/lambda/SlackNotifySystem-dev-ApiFunction
```

## 開発用コマンド

```bash
npm run build                    # TypeScriptコンパイル
npm run watch                    # ファイル変更監視
npm run test                     # テスト実行
cdk synth                        # CloudFormationテンプレート生成
cdk diff                         # 差分確認
```

## 移行のメリット

- **型安全性**: TypeScriptによるコンパイル時エラー検出
- **豊富な制御**: AWS CDKの豊富なコンストラクト
- **AWSネイティブ**: AWS公式サポート
- **テスタビリティ**: 単体テストが容易
