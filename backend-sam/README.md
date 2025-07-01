# AWS SAM版 Slack Integration Backend

このディレクトリには、Slack連携技術検証システムのAWS SAM版が含まれています。
元のServerless FrameworkからAWS SAMに移行し、全てのLambda関数コードを内包した自己完結型の実装です。

## 前提条件

- Node.js 22以上
- AWS SAM CLI (`pip install aws-sam-cli`)
- AWS CLI設定済み

## ディレクトリ構造

```
backend-sam/
├── src/                          # Lambda関数コード
│   ├── api/                      # メインAPI（旧backend/app.js）
│   │   ├── app.js
│   │   └── package.json
│   ├── oauth/                    # OAuth処理（旧backend/oauth.js）
│   │   ├── oauth.js
│   │   └── package.json
│   ├── slackbot/                 # Slackbot（旧slackbot/bot.js）
│   │   ├── bot.js
│   │   └── package.json
│   └── shared/                   # 共通ファイル
│       └── slack_scopes.js
├── config/                       # 設定ファイル
│   ├── secrets.example.yml       # 設定例
│   └── secrets.yml               # 実際の設定（gitignore対象）
├── template.yaml                 # SAMテンプレート
├── samconfig.toml               # SAM設定ファイル
├── deploy.sh                    # デプロイスクリプト
└── README.md                    # このファイル
```

## セットアップ

### 1. 設定ファイルの準備

```bash
# 設定ファイルをコピーして編集
cp config/secrets.example.yml config/secrets.yml
# secrets.ymlを編集してSlackアプリの情報を設定
```

### 2. ビルドとデプロイ

#### 基本デプロイ
```bash
# 依存関係のインストールとビルド
sam build

# 初回デプロイ（対話式）
sam deploy --guided

# 2回目以降のデプロイ
sam deploy
```

#### 環境別デプロイ
```bash
# 開発環境にデプロイ
./deploy.sh dev

# 本番環境にデプロイ  
./deploy.sh prod

# デフォルト環境にデプロイ
./deploy.sh
```

#### 環境変数の設定例
開発環境用：
```bash
export SLACK_CLIENT_ID_DEV="your-dev-client-id"
export SLACK_CLIENT_SECRET_DEV="your-dev-client-secret"
export SLACK_SIGNING_SECRET_DEV="your-dev-signing-secret"
export SLACK_REDIRECT_URI_DEV="https://dev-api-url/slack/oauth/callback"
export SLACK_BOT_TOKEN_DEV="xoxb-your-dev-bot-token"
```

本番環境用：
```bash
export SLACK_CLIENT_ID_PROD="your-prod-client-id"
export SLACK_CLIENT_SECRET_PROD="your-prod-client-secret"
export SLACK_SIGNING_SECRET_PROD="your-prod-signing-secret"
export SLACK_REDIRECT_URI_PROD="https://prod-api-url/slack/oauth/callback"
export SLACK_BOT_TOKEN_PROD="xoxb-your-prod-bot-token"
```

## 設定管理

このSAM版では、設定の読み込みを以下の順序で行います：

1. **環境変数** (最優先)
2. **設定ファイル** (`config/secrets.yml`)
3. **デフォルト値**

### 開発環境
ローカル開発では`config/secrets.yml`ファイルから読み込みます。

### 本番環境

本番環境では以下の方法でシークレットを管理できます：

#### 方法1: デプロイ時にパラメータ指定 (推奨)
```bash
# 環境変数でシークレットを設定
export SLACK_CLIENT_ID="your-client-id"
export SLACK_CLIENT_SECRET="your-client-secret"
export SLACK_SIGNING_SECRET="your-signing-secret"
export SLACK_BOT_TOKEN="xoxb-your-bot-token"
export SLACK_REDIRECT_URI="https://your-api-url/slack/oauth/callback"

# デプロイ実行
sam deploy
```

#### 方法2: AWS Systems Manager Parameter Store (より安全)
```bash
# パラメータを事前にAWSに登録
aws ssm put-parameter --name "/slack-integration/client-id" --value "your-client-id" --type "String"
aws ssm put-parameter --name "/slack-integration/client-secret" --value "your-client-secret" --type "SecureString"
aws ssm put-parameter --name "/slack-integration/signing-secret" --value "your-signing-secret" --type "SecureString"
aws ssm put-parameter --name "/slack-integration/bot-token" --value "xoxb-your-bot-token" --type "SecureString"
aws ssm put-parameter --name "/slack-integration/redirect-uri" --value "https://your-api-url/slack/oauth/callback" --type "String"

# デプロイ実行（パラメータは自動で解決される）
sam deploy
```

#### 方法3: 直接パラメータ指定
```bash
sam deploy \
  --parameter-overrides \
  SlackClientId="your-client-id" \
  SlackClientSecret="your-client-secret" \
  SlackSigningSecret="your-signing-secret" \
  SlackBotToken="xoxb-your-bot-token" \
  SlackRedirectUri="https://your-api-url/slack/oauth/callback"
```

## 機能

### Lambda関数

1. **API Function** (`src/api/`)
   - メインのSlack Integration API
   - 統合管理、通知送信等
   - エンドポイント: `/{proxy+}`

2. **OAuth Function** (`src/oauth/`)
   - SlackワークスペースのOAuth認証
   - ワークスペース・チャンネル管理
   - エンドポイント: `/slack/oauth/{proxy+}`

3. **SlackBot Function** (`src/slackbot/`)
   - Slack Bolt使用のSlackアプリ
   - イベント処理
   - エンドポイント: `/slack/events`

### AWS リソース

- **API Gateway**: REST API
- **DynamoDB**: データストレージ（Pay-per-request）
- **CloudWatch Logs**: ログ管理（7日間保持）

## ローカル開発

```bash
# ローカルAPIの起動
sam local start-api

# 個別関数のテスト
sam local invoke ApiFunction --event events/api-event.json
```

## 移行のメリット

### 自己完結性
- 元の`backend/`と`slackbot/`ディレクトリに依存しない
- 全てのコードが`backend-sam/src/`以下に配置
- 独立したpackage.jsonによる依存関係管理

### 設定管理
- 外部ファイル（`config/secrets.yml`）による設定管理
- 環境変数フォールバック機能
- 本番環境とローカル環境の設定切り替え

### AWSネイティブ
- CloudFormationベースのインフラ定義
- AWS公式ツールによるサポート
- 高速なデプロイとロールバック

## トラブルシューティング

### ビルドエラー
```bash
# 依存関係のクリーンインストール
cd src/api && rm -rf node_modules package-lock.json && npm install
cd ../oauth && rm -rf node_modules package-lock.json && npm install
cd ../slackbot && rm -rf node_modules package-lock.json && npm install
```

### デプロイエラー
```bash
# SAM設定の確認
sam validate

# 詳細ログでデプロイ
sam deploy --debug
```

## コマンド

```bash
npm run build        # ビルド
npm run deploy       # デプロイ
npm run local-start  # ローカルAPI起動
npm run logs         # ログ確認
npm run validate     # テンプレート検証
npm run sync         # 開発用同期
```

## ローカル開発

```bash
# ローカルでAPI Gateway + Lambdaを起動
sam local start-api

# 特定の関数を直接実行
sam local invoke ApiFunction --event events/api-event.json

# ログをリアルタイムで監視
sam logs -n ApiFunction --stack-name slack-integration-sam --tail
```

## デバッグ

```bash
# 詳細ログでデプロイ
sam deploy --debug

# CloudFormationイベントを監視
sam deploy --watch
```
