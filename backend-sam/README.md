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
# 使用する環境に応じて設定ファイルをコピー

# デフォルト環境
cp samconfig.example.toml samconfig.toml

# 開発環境
cp samconfig.dev.example.toml samconfig.dev.toml

# 本番環境
cp samconfig.prod.example.toml samconfig.prod.toml

# 各ファイルを編集してSlackアプリの実際の情報を設定
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

## 設定管理

このSAM版では、設定を環境別のsamconfig.tomlファイルに直接ハードコードして管理します：

### 設定ファイル構成
- **`samconfig.example.toml`** - デフォルト環境のサンプル
- **`samconfig.dev.example.toml`** - 開発環境のサンプル  
- **`samconfig.prod.example.toml`** - 本番環境のサンプル
- **`samconfig.toml`** - デフォルト環境（gitignore対象）
- **`samconfig.dev.toml`** - 開発環境（gitignore対象）
- **`samconfig.prod.toml`** - 本番環境（gitignore対象）

### セットアップ手順
1. サンプルファイルから実際の設定ファイルをコピー
2. 各ファイルの`parameter_overrides`セクションに実際のSlack設定を記入
3. デプロイ時に環境を指定（`./deploy.sh dev` など）

### 特徴
- **シンプル**: 環境変数やAWSサービスに依存しない
- **環境分離**: 各環境で完全に独立した設定
- **セキュリティ**: 実際の設定ファイルはgitから除外
- **ポータブル**: どの環境でも同じ方法でデプロイ可能
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
