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
│   └── backend-cdk.ts
├── lib/                         # CDKスタック定義
│   └── backend-cdk-stack.ts
├── lambda/                      # Lambda関数コード  
│   ├── api/                     # メインAPI（旧backend/app.js）
│   │   ├── app.js
│   │   └── package.json
│   ├── oauth/                   # OAuth処理（旧backend/oauth.js）
│   │   ├── oauth.js
│   │   └── package.json
│   ├── slackbot/                # Slackbot（旧slackbot/bot.js）
│   │   ├── bot.js
│   │   └── package.json
│   └── shared/                  # 共通ファイル
│       └── slack_scopes.js
├── config/                      # 設定ファイル
│   ├── cdkconfig.example.json   # 設定例
│   ├── cdkconfig.dev.example.json
│   ├── cdkconfig.prod.example.json
│   ├── cdkconfig.json           # 実際の設定（gitignore対象）
│   ├── cdkconfig.dev.json       # 開発環境設定（gitignore対象）
│   └── cdkconfig.prod.json      # 本番環境設定（gitignore対象）
├── cdk.json                     # CDK設定
├── package.json                 # 依存関係
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

設定ファイル例：

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

# デプロイ前の差分確認
cdk diff BackendCdkStack-dev --profile <PROFILE_NAME>

# 開発環境へのデプロイ
cdk deploy BackendCdkStack-dev --profile <PROFILE_NAME>

# 本番環境へのデプロイ
cdk deploy BackendCdkStack-prod --profile <PROFILE_NAME>

# スタック削除
cdk destroy BackendCdkStack-dev --profile <PROFILE_NAME>
```

#### 例：MyAWSプロファイルを使用する場合

```bash
# 開発環境デプロイ
cdk deploy BackendCdkStack-dev --profile MyAWS

# 本番環境デプロイ
cdk deploy BackendCdkStack-prod --profile MyAWS
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
   cdk deploy --verbose --profile <PROFILE_NAME>
   ```

3. **設定ファイル不存在**

   ```bash
   cp config/cdkconfig.dev.example.json config/cdkconfig.dev.json
   ```

### ログ確認

```bash
# CloudWatch Logsでログを確認
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/BackendCdkStack" --profile <PROFILE_NAME>

# 特定のLambda関数のログ
aws logs tail /aws/lambda/BackendCdkStack-dev-ApiFunction --profile <PROFILE_NAME>
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
