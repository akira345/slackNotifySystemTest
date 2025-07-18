# AWS CDK版 Slack Integration Backend

このディレクトリには、Slack連携技術検証システムのAWS CDK版が含まれています。
元のServerless FrameworkからAWS CDKに移行し、TypeScriptでインフラ定義を行う実装です。

**重要**: 本実装では、**ライフサイクルベースでのスタック分割**を採用しています。

## アーキテクチャ概要

### 🏗️ スタック構成

```
1. DataStack (永続リソース)
   └── DynamoDB Table（削除保護、バックアップ設定）

2. ApiStack (アプリケーション層)
   ├── Lambda Functions（API、OAuth、SlackBot）
   ├── API Gateway（Frontend用、SlackBot用）
   ├── IAM Roles（Lambda専用権限）
   └── CloudWatch Logs
```

### 🎯 分割の利点

- **リスク軽減**: Lambda更新時にDynamoDBが影響を受けない
- **デプロイ効率**: 部分デプロイによる高速化
- **データ保護**: 永続データの意図しない削除防止
- **権限分離**: 開発者はAPIスタックのみ操作可能

## 前提条件

- Node.js 22以上
- AWS CDK CLI (`npm install -g aws-cdk`)
- AWS CLI設定済み
- TypeScript基本知識

## ディレクトリ構造

```
backend-cdk/
├── bin/                         # CDKアプリケーションエントリポイント
│   └── slack-integration.ts    # メインアプリ（両スタック統合）
├── lib/                         # CDKスタック定義（現在の実装）
│   ├── dynamodb.ts             # DataStack（DynamoDB）
│   └── api-stack.ts            # ApiStack（Lambda、API Gateway）
├── legacy/                      # 旧版実装（参考用）
│   ├── slack-integration-stack.ts # 単一スタック実装（非推奨）
│   └── README.md               # 旧版の説明
├── lambda/                      # Lambda関数コード
│   ├── api/                    # Frontend API Lambda
│   ├── oauth/                  # Slack OAuth Lambda
│   ├── slackbot/               # SlackBot Lambda
│   └── shared/                 # 共通設定
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

## デプロイ手順

### ⚠️ 重要: デプロイ順序

**スタック分割により、デプロイ順序が重要です:**

```bash
# 1. データスタック（永続リソース）を先にデプロイ
cdk deploy slack-integration-data-dev --context env=dev

# 2. APIスタック（アプリケーション層）をデプロイ
cdk deploy slack-integration-api-dev --context env=dev

# または両方同時にデプロイ（CDKが依存関係を自動解決）
cdk deploy --all --context env=dev
```

### 4. 基本的なデプロイコマンド

```bash
# TypeScriptのコンパイル
npm run build

# 開発環境への全スタックデプロイ
cdk deploy --all --context env=dev

# 本番環境への全スタックデプロイ
cdk deploy --all --context env=prod

# 特定スタックのみデプロイ（Lambda更新時など）
cdk deploy slack-integration-api-dev --context env=dev

# デプロイ前の差分確認
cdk diff --context env=dev

# スタック削除（注意: データも削除されます）
cdk destroy --all --context env=dev
```

### 5. 運用時のデプロイパターン

```bash
# 🚀 高速デプロイ: Lambda機能更新のみ
cdk deploy slack-integration-api-dev --context env=dev

# 🛡️ 安全デプロイ: データスキーマ変更時
cdk deploy slack-integration-data-dev --context env=dev
cdk deploy slack-integration-api-dev --context env=dev

# 🔍 デプロイ前確認
cdk diff slack-integration-api-dev --context env=dev
```

#### 例：特定のAWSプロファイルを使用する場合

```bash
# 開発環境デプロイ
cdk deploy --all --context env=dev --profile MyAWS

# 本番環境デプロイ
cdk deploy --all --context env=prod --profile MyAWS
```

## 設定管理

このCDK版では、環境別のJSONファイルで設定を管理します：

### 設定ファイル構成

- **`config/cdkconfig.dev.example.json`** - 開発環境のサンプル設定
- **`config/cdkconfig.prod.example.json`** - 本番環境のサンプル設定
- **`config/cdkconfig.dev.json`** - 開発環境の実際の設定（gitignore対象）
- **`config/cdkconfig.prod.json`** - 本番環境の実際の設定（gitignore対象）

## スタック分割の詳細

### 🎯 設計思想

本実装では、**ライフサイクルベースでのスタック分割**を採用しています：

#### DataStack（永続リソース）
- **目的**: データの長期保護と安定性
- **内容**: DynamoDB Table
- **更新頻度**: 低（スキーマ変更時のみ）
- **削除保護**: 本番環境で有効化
- **バックアップ**: 本番環境で自動設定

#### ApiStack（アプリケーション層）
- **目的**: 機能の迅速な開発・デプロイ
- **内容**: Lambda Functions、API Gateway、IAM Roles、CloudWatch Logs
- **更新頻度**: 高（機能追加・修正時）
- **デプロイ**: 高速、データに影響なし

### 🚀 運用上のメリット

1. **リスク軽減**: Lambda更新時にDynamoDBが影響を受けない
2. **高速デプロイ**: アプリケーション層のみの部分デプロイ
3. **データ保護**: 意図しないデータ削除の防止
4. **権限分離**: 開発者とインフラ管理者の責任範囲明確化

### ⚠️ 運用上の注意点

1. **デプロイ順序**: データスタック → APIスタックの順番を守る
2. **Cross-Stack Reference**: スタック間でのリソース参照
3. **環境一致**: 両スタックで同じ環境設定を使用

### 特徴

- **型安全性**: TypeScriptによる型チェック
- **環境分離**: 環境別設定ファイルによる完全な分離
- **AWSネイティブ**: CloudFormationベースのインフラ定義
- **豊富な制御**: AWS CDKの豊富なコンストラクトを活用
- **スタック分割**: ライフサイクルベースでの最適化

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

## 旧版実装について

### 📁 Legacy実装

`legacy/`ディレクトリには、スタック分割前の単一スタック実装が保存されています：

- **`legacy/slack-integration-stack.ts`**: 全リソースを1つのスタックに集約した初期CDK実装
- **`legacy/README.md`**: 旧版の詳細説明

### 🔄 移行履歴

1. **2025年7月1日**: Serverless Framework → CDK単一スタック
2. **2025年7月18日**: 単一スタック → ライフサイクルベース分割スタック
3. **現在**: 旧版は`legacy/`で参考用として保持

### ⚠️ 注意事項

- 旧版実装は**参考・比較用のみ**
- 本番環境では**現在の分割スタック構成を使用**
- 緊急時の代替案として保持
