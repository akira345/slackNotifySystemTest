# AWS SAM Migration

このディレクトリには、Serverless FrameworkからAWS SAMへの移行サンプルが含まれています。

## 前提条件

- Node.js 22以上
- AWS SAM CLI (`pip install aws-sam-cli`)
- AWS CLI設定済み

## セットアップ

```bash
# 環境変数の設定
export SLACK_CLIENT_ID="your-slack-client-id"
export SLACK_CLIENT_SECRET="your-slack-client-secret"
export SLACK_SIGNING_SECRET="your-slack-signing-secret"
export SLACK_REDIRECT_URI="your-redirect-uri"

# ビルド
sam build

# デプロイ
sam deploy --guided  # 初回のみ
# または
./deploy.sh
```

## 主要なファイル

- `template.yaml` - SAMテンプレート（CloudFormation拡張）
- `samconfig.toml` - SAM設定ファイル
- `deploy.sh` - デプロイスクリプト

## Serverless Frameworkとの比較

### メリット

- AWSネイティブツール
- CloudFormationベース
- ローカル開発環境が充実
- デプロイが高速
- AWS公式サポート

### 考慮点

- AWS専用（マルチクラウド非対応）
- YAMLベースの設定
- 複雑なロジックは書きにくい

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
