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
├── package.json                 # 依存関係
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

SAMコマンドを直接実行します。`<PROFILE_NAME>`を使用するAWSプロファイル名に置き換えてください：

```bash
# 依存関係のインストールとビルド
sam build

# 初回デプロイ（対話式）
sam deploy --guided --profile <PROFILE_NAME>

# 開発環境へのデプロイ実行
sam deploy --config-env dev --profile <PROFILE_NAME>

# 本番環境へのデプロイ実行
sam deploy --config-env prod --profile <PROFILE_NAME>

# デプロイ前差分確認
sam diff --config-env dev --profile <PROFILE_NAME>

# CloudFormationテンプレートの生成（確認用）
sam build && sam package --s3-bucket your-bucket --profile <PROFILE_NAME>

# スタック削除
sam delete --config-env dev --profile <PROFILE_NAME>
```

#### 例：MyAWSプロファイルを使用する場合

```bash
# 開発環境デプロイ
sam deploy --config-env dev --profile MyAWS

# 本番環境デプロイ
sam deploy --config-env prod --profile MyAWS
```

## 設定管理

このSAM版では、設定を環境別のsamconfig.tomlファイルに直接記述して管理します：

### 設定ファイル構成

- **`samconfig.example.toml`** - デフォルト環境のサンプル
- **`samconfig.dev.example.toml`** - 開発環境のサンプル  
- **`samconfig.prod.example.toml`** - 本番環境のサンプル
- **`samconfig.local.example.toml`** - ローカル実行用のサンプル
- **`samconfig.toml`** - デフォルト環境（gitignore対象）
- **`samconfig.dev.toml`** - 開発環境（gitignore対象）
- **`samconfig.prod.toml`** - 本番環境（gitignore対象）
- **`samconfig.local.toml`** - ローカル実行用（gitignore対象）

### セットアップ手順

1. サンプルファイルから実際の設定ファイルをコピー
2. 各ファイルの`parameter_overrides`セクションに実際のSlack設定を記入
3. デプロイ時に環境を指定（`sam deploy --config-env dev` など）

### 特徴

- **シンプル**: 環境変数やAWSサービスに依存しない
- **環境分離**: 各環境で完全に独立した設定
- **セキュリティ**: 実際の設定ファイルはgitから除外
- **ポータブル**: どの環境でも同じ方法でデプロイ可能

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

## 移行のメリット

- **自己完結性**: 元の`backend/`と`slackbot/`ディレクトリに依存しない
- **環境分離**: 環境別設定ファイルによる完全な分離
- **AWSネイティブ**: CloudFormationベースのインフラ定義
- **高速デプロイ**: AWS公式ツールによる最適化されたデプロイ

## トラブルシューティング

### よくある問題

1. **ビルドエラー**

   ```bash
   # 依存関係のクリーンインストール
   cd src/api && rm -rf node_modules package-lock.json && npm install
   cd ../oauth && rm -rf node_modules package-lock.json && npm install
   cd ../slackbot && rm -rf node_modules package-lock.json && npm install
   ```

2. **デプロイエラー**

   ```bash
   # SAM設定の確認
   sam validate --profile <PROFILE_NAME>

   # 詳細ログでデプロイ
   sam deploy --debug --profile <PROFILE_NAME>
   ```

3. **設定ファイル不存在**

   ```bash
   cp samconfig.dev.example.toml samconfig.dev.toml
   ```

4. **ローカル実行エラー**

   ```bash
   # ビルド後にローカル実行
   sam build
   sam local start-api --config-env local --profile <PROFILE_NAME>

   # 環境変数設定の確認
   cat samconfig.local.toml
   ```

5. **AWSプロファイルエラー**

   ```bash
   # 利用可能なプロファイル確認
   aws configure list-profiles
   
   # プロファイル指定での認証テスト
   aws sts get-caller-identity --profile <PROFILE_NAME>
   ```

### ログ確認

```bash
# Lambda関数のログを確認（プロファイル名を指定）
sam logs -n ApiFunction --stack-name slack-integration-sam-dev --tail --profile <PROFILE_NAME>
sam logs -n OAuthFunction --stack-name slack-integration-sam-dev --tail --profile <PROFILE_NAME>
sam logs -n SlackBotFunction --stack-name slack-integration-sam-dev --tail --profile <PROFILE_NAME>

# 特定期間のログを確認
sam logs -n ApiFunction --stack-name slack-integration-sam-dev --start-time '10min ago' --profile <PROFILE_NAME>

# CloudFormationイベント確認
aws cloudformation describe-stack-events --stack-name slack-integration-sam-dev --profile <PROFILE_NAME>

# スタック状態確認
aws cloudformation describe-stacks --stack-name slack-integration-sam-dev --profile <PROFILE_NAME>
```

## 🔄 その他の操作

### 開発用コマンド

```bash
sam build                        # ビルド
sam validate --profile <PROFILE_NAME>    # テンプレート検証
sam sync --watch --profile <PROFILE_NAME> # 開発用同期
```

### ローカル開発

```bash
# ローカル実行用設定ファイルの作成
cp samconfig.local.example.toml samconfig.local.toml

# ローカルでAPI Gateway + Lambdaを起動（プロファイル指定）
sam local start-api --config-env local --profile <PROFILE_NAME>

# 特定の関数を直接実行
sam local invoke ApiFunction --config-env local --event events/api-event.json --profile <PROFILE_NAME>
```

### 直接SAMコマンド実行

```bash
sam list --profile <PROFILE_NAME>                    # スタック一覧
sam validate --profile <PROFILE_NAME>                # テンプレート検証
sam logs -n ApiFunction --stack-name slack-integration-sam-dev --tail --profile <PROFILE_NAME>  # ログ監視
```

### 新しいコードをデプロイする場合

```bash
sam build && sam deploy --config-env dev --profile <PROFILE_NAME>
```

### リソースを完全に削除する場合

```bash
sam delete --config-env dev --profile <PROFILE_NAME>
```
