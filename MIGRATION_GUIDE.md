# Infrastructure as Code Migration Samples

このリポジトリには、Serverless FrameworkからAWS CDK、AWS SAMへの移行サンプルが含まれています。

## 🌟 概要

元々のServerless Frameworkで構築されたSlack通知システムを、異なるIaCツールで実装した移行サンプル集です。

## 📁 ブランチ構成

| ブランチ | IaCツール | 説明 |
|---------|-----------|------|
| `main` | Serverless Framework | 元の実装 |
| `migration/aws-cdk` | AWS CDK | TypeScript + AWS CDKでの実装 |
| `migration/aws-sam` | AWS SAM | CloudFormationベースの実装 |

## 🚀 移行サンプル

### 1. AWS CDK (TypeScript)

```bash
git checkout migration/aws-cdk
cd backend-cdk
npm install
export SLACK_CLIENT_ID="your-value"
export SLACK_CLIENT_SECRET="your-value"
export SLACK_SIGNING_SECRET="your-value"
export SLACK_REDIRECT_URI="your-value"
cdk deploy
```

**特徴:**
- TypeScriptでインフラを記述
- 型安全性とコード補完
- 豊富なAWSコンストラクト
- 細かいリソース制御が可能

### 2. AWS SAM (CloudFormation)

```bash
git checkout migration/aws-sam
cd backend-sam
export SLACK_CLIENT_ID="your-value"
export SLACK_CLIENT_SECRET="your-value"
export SLACK_SIGNING_SECRET="your-value"
export SLACK_REDIRECT_URI="your-value"
sam build && sam deploy --guided
```

**特徴:**

- AWSネイティブツール
- ローカル開発環境が充実
- CloudFormationベース
- サーバーレス特化

## 📊 比較表

| 項目 | Serverless Framework | AWS CDK | AWS SAM |
|------|---------------------|---------|---------|
| **学習コスト** | 低 | 中 | 低-中 |
| **設定記述** | YAML | TypeScript | YAML |
| **クラウド対応** | マルチ | AWS特化 | AWS特化 |
| **ローカル開発** | 限定的 | 普通 | 優秀 |
| **デプロイ速度** | 高速 | 中 | 高速 |
| **細かい制御** | 限定的 | 豊富 | 中 |
| **コミュニティ** | 大 | 大 | 中 |
| **企業サポート** | - | AWS公式 | AWS公式 |

## 🔧 使用技術

すべての実装で以下のAWSサービスを使用：

- **Lambda**: Node.js 22ランタイム
- **API Gateway**: REST API
- **DynamoDB**: NoSQLデータベース
- **CloudWatch**: ログ管理
- **IAM**: 権限管理

## 📋 機能要件

すべての実装で同等の機能を提供：

1. Slack OAuth認証
2. API Gateway経由のHTTPエンドポイント
3. DynamoDBへのデータ永続化
4. Slack API連携
5. CORS対応

## 🎯 移行の選択指針

### AWS CDKを選ぶべき場合

- TypeScriptの知識がある
- 細かいAWSリソース制御が必要
- 型安全性を重視
- AWSエコシステム内での開発

### AWS SAMを選ぶべき場合

- AWSサーバーレス特化
- ローカル開発を重視
- 素早いプロトタイピング
- AWS公式サポートが必要

### Serverless Frameworkを継続する場合

- 素早い開発とデプロイが最優先
- シンプルな構成で十分
- 複数クラウドでの展開予定
- 学習コストを抑えたい

## 📖 各実装の詳細

各ブランチの `README.md` に詳細なセットアップ手順と使用方法が記載されています。

## 🤝 貢献

この移行サンプルを改善したい場合：

1. 該当ブランチをチェックアウト
2. 変更を実装
3. プルリクエストを作成

## 📝 ライセンス

MIT License
