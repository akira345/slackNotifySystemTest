# CDK Architecture Design & Implementation Guide

## 📋 プロジェクト概要

**プロジェクト名**: Slack通知システム  
**リポジトリ**: slackNotifySystemTest  
**現在ブランチ**: migration/aws-cdk  
**実装フェーズ**: CDK最適化完了 (aws-lambda-nodejs & 高レベルコンストラクト適用済み)

## 🏗️ アーキテクチャ設計思想

### 1. Cross-Stack分離アーキテクチャ

```text
┌─────────────────┐    ┌─────────────────┐
│   DataStack     │    │   ApiStack      │
│ (永続化層)       │────▶│ (アプリ層)       │
│ - DynamoDB      │    │ - Lambda        │
│ - Lifecycle独立  │    │ - API Gateway   │
└─────────────────┘    └─────────────────┘
```

**設計原則**:

- **データ層の保護**: DynamoDB等の永続化リソースを独立スタックで管理
- **デプロイ柔軟性**: アプリケーション層のみの更新が可能
- **運用安全性**: データ削除リスクの最小化

### 2. aws-lambda-nodejs最適化戦略

**採用理由**: JavaScript Lambda関数でのesbuild統合による超高速ビルド

**技術スタック**:

- **Runtime**: Node.js 22 (最新LTS)
- **Architecture**: x86_64 (コスパ重視)
- **Module Format**: ES Modules (import/export)
- **Bundle Tool**: esbuild (minify + tree shaking)

```typescript
// 最適化設定例
bundling: {
  minify: true,           // 本番最適化
  sourceMap: true,        // デバッグ支援
  target: 'node22',       // 最新Node.js
  format: OutputFormat.ESM, // ES Modules
  esbuildArgs: {
    '--platform': 'node',
    '--tree-shaking': true,
    '--keep-names': true,
  },
  externalModules: ['@aws-sdk/*'], // AWS SDK外部化
}
```

## 🚀 実装ハイライト

### 1. 高レベルコンストラクト適用

**Before (冗長)**: 手動Integration設定

```typescript
const api = new apigateway.RestApi(this, 'Api', {...});
const integration = new apigateway.LambdaIntegration(func);
api.root.addProxy({ defaultIntegration: integration });
```

**After (最適化)**: LambdaRestApi自動統合

```typescript
const api = new LambdaRestApi(this, 'Api', {
  handler: func,  // 自動統合
  defaultCorsPreflightOptions: { ... }
});
```

**削減効果**: 100行以上のコード簡素化

### 2. ファクトリパターン活用

**LogGroup統一管理**:

```typescript
const createLogGroup = (name: string) => new LogGroup(this, `${name}LogGroup`, {
  logGroupName: `/aws/lambda/${projectName}-${environment}-${name}`,
  retention: RetentionDays.ONE_WEEK,
  removalPolicy: cdk.RemovalPolicy.DESTROY,
});
```

**PolicyStatement簡素化**:

```typescript
const dynamoPolicy = new PolicyStatement({
  effect: Effect.ALLOW,
  actions: ['dynamodb:Query', 'dynamodb:GetItem', ...],
  resources: [tableArn, `${tableArn}/index/*`]
});
```

### 3. API分離戦略

**3つの独立API Gateway**:

1. **BackendApi**: Frontend用 (メイン機能)
2. **OAuthApi**: OAuth認証専用
3. **SlackBotApi**: Slack Webhook専用

**利点**:

- 責任分離
- セキュリティ境界明確化
- 独立スケーリング

## 📁 プロジェクト構造

```text
backend-cdk/
├── lib/
│   ├── slack-integration-stack.ts  # メインスタック (Cross-Stack調整)
│   ├── data-stack.ts              # DynamoDB等永続化層
│   └── api-stack.ts               # Lambda + API Gateway層
├── lambda/                        # JavaScript ES Modules
│   ├── api/app.js                 # Backend API
│   ├── oauth/oauth.js             # OAuth処理
│   └── slackbot/bot.js            # Slack Bot
├── config/
│   ├── cdkconfig.dev.example.json
│   └── cdkconfig.prod.example.json
└── package.json                   # esbuild依存関係含む
```

## 🔧 技術的実装詳細

### 1. Cross-Stack Reference Pattern

```typescript
// data-stack.ts
export class DataStack extends cdk.Stack {
  public readonly table: dynamodb.Table;
  
  constructor(scope: Construct, id: string, props: DataStackProps) {
    this.table = new dynamodb.Table(this, 'SlackIntegrationTable', {
      // Lifecycle independent configuration
    });
  }
}

// api-stack.ts
export interface ApiStackProps extends cdk.StackProps {
  tableArn: string;    // Cross-stack reference
  tableName: string;   // Cross-stack reference
}
```

### 2. Environment Configuration Pattern

```typescript
// 環境別設定管理
const config = require(`../config/cdkconfig.${env}.json`);

// Lambda環境変数統一注入
environment: {
  DYNAMODB_TABLE: props.tableName,
  DYNAMODB_REGION: config.DYNAMODB_REGION,
  SLACK_CLIENT_ID: config.SLACK_CLIENT_ID,
  // ... 他設定
}
```

### 3. IAM最小権限原則

```typescript
// Lambda実行ロール
const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
  assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
  managedPolicies: [
    ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
  ],
});

// DynamoDB操作権限のみ付与
const dynamoPolicy = new PolicyStatement({
  effect: Effect.ALLOW,
  actions: [
    'dynamodb:Query',
    'dynamodb:GetItem', 
    'dynamodb:PutItem',
    'dynamodb:DeleteItem',
    'dynamodb:Scan',
  ],
  resources: [
    props.tableArn,
    `${props.tableArn}/index/*`,  // GSI対応
  ],
});
```

## 🛠️ デプロイ & 運用

### 1. CDK Commands

```bash
# 開発環境デプロイ
cdk deploy --context env=dev

# 本番環境デプロイ  
cdk deploy --context env=prod

# スタック別デプロイ
cdk deploy DataStack ApiStack --context env=dev
```

### 2. 設定ファイル管理

```json
// cdkconfig.dev.json (実際の値)
{
  "DYNAMODB_REGION": "ap-northeast-1",
  "SLACK_CLIENT_ID": "actual_client_id",
  "SLACK_CLIENT_SECRET": "actual_secret",
  // ... 実際の認証情報
}
```

### 3. .gitignore設定

```gitignore
# ビルド成果物
**/cdk.out/
**/dist/           # esbuild出力
**/node_modules

# 認証情報
backend-cdk/config/cdkconfig.json
backend-cdk/config/cdkconfig.dev.json
backend-cdk/config/cdkconfig.prod.json

# サンプルファイルは除外対象外
!backend-cdk/config/cdkconfig.*.example.json
```

## 📊 パフォーマンス最適化

### 1. esbuild最適化効果

- **Bundle Size**: Tree shaking適用で大幅削減
- **Cold Start**: minificationによる起動高速化  
- **Memory Usage**: 不要モジュール除外
- **Build Speed**: TypeScript不要でビルド高速化

### 2. AWS SDK v3外部化

```typescript
externalModules: ['@aws-sdk/*']
```

**効果**: Lambda Layer活用でデプロイサイズ削減

## 🔍 トラブルシューティング

### 1. よくある問題

**問題**: `OutputFormat.ESM`でのimport/export問題
**解決**: Lambda関数のpackage.jsonに`"type": "module"`設定

**問題**: Cross-stack参照エラー
**解決**: DataStack先行デプロイ、ARN/名前の正確な受け渡し

### 2. デバッグ方法

```typescript
// Source map有効化
bundling: {
  sourceMap: true,  // CloudWatch Logsでのスタックトレース改善
}

// ログ出力設定
logGroup: createLogGroup('function-name'),
```

## 🎯 今後の拡張計画

### 1. 監視・アラート強化

- CloudWatch Alarms追加
- X-Ray分散トレーシング
- Custom Metrics実装

### 2. セキュリティ強化

- VPC Lambda配置
- WAF適用検討
- Secrets Manager移行

### 3. CI/CD自動化

- GitHub Actions CDK Pipeline
- 自動テスト統合
- Blue/Green Deployment

## 📝 設計決定記録

### 1. なぜaws-lambda-nodejsを選択したか

- **JavaScript互換**: 既存Lambda関数がJavaScript
- **ビルド高速化**: esbuild統合による超高速バンドル
- **運用簡素化**: TypeScriptコンパイル不要

### 2. なぜ3つのAPI Gatewayに分離したか

- **セキュリティ**: 異なる認証要件
- **スケーラビリティ**: 独立したスケーリング
- **保守性**: 責任範囲の明確化

### 3. なぜCross-Stack分離したか

- **データ保護**: 永続化層の事故削除防止
- **デプロイ柔軟性**: アプリ層のみの頻繁更新
- **ライフサイクル管理**: 異なる更新頻度に対応

## 💡 GitHub Copilot向け指示

このプロジェクトで作業する際は:

1. **必ずesbuild最適化を維持**してください
2. **Cross-stack参照の整合性**を確認してください  
3. **高レベルコンストラクト優先**でコードを簡潔に保ってください
4. **環境別設定ファイル**の秘匿性を維持してください
5. **IAM最小権限原則**を遵守してください

**重要**: このアーキテクチャは aws-lambda-nodejs + 高レベルコンストラクトの最適化が完了した状態です。変更時は既存の最適化を損なわないよう注意してください。

---

**最終更新**: 2025年7月18日  
**対応CDKバージョン**: 2.x  
**対応Node.jsバージョン**: 22.x  
**最適化ステータス**: ✅ 完了 (aws-lambda-nodejs + 高レベルコンストラクト適用済み)
