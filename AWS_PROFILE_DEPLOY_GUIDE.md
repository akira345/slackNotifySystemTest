# AWS Profile デプロイガイド

## AWS Profile設定方法

### 1. AWS CLIのインストール（必要な場合）
```bash
# Ubuntu/Debian
sudo apt install awscli

# macOS
brew install awscli

# または pip
pip install awscli
```

### 2. AWS Profileの設定
```bash
# デフォルトプロファイルの設定
aws configure

# 名前付きプロファイルの設定
aws configure --profile myprofile
```

必要な情報：
- AWS Access Key ID
- AWS Secret Access Key
- Default region name (例: ap-northeast-1)
- Default output format (例: json)

### 3. プロファイルの確認
```bash
# 設定済みプロファイル一覧
aws configure list-profiles

# 現在のプロファイル設定確認
aws configure list

# 指定プロファイルの設定確認
aws configure list --profile myprofile
```

## デプロイコマンド

### 基本的なデプロイコマンド
```bash
# デフォルトAWS Profileを使用
cd slackbot && npx sls deploy --stage dev
cd backend && npx sls deploy --stage dev

# 特定のAWS Profileを指定
cd slackbot && AWS_PROFILE=your-profile-name npx sls deploy --stage dev
cd backend && AWS_PROFILE=your-profile-name npx sls deploy --stage dev

# 環境変数での指定（複数コマンド実行時に便利）
export AWS_PROFILE=your-profile-name
cd slackbot && npx sls deploy --stage dev
cd backend && npx sls deploy --stage dev
```

### プロダクション環境デプロイ
```bash
# プロダクション環境
AWS_PROFILE=your-profile-name npx sls deploy --stage prod

# リージョン指定
AWS_PROFILE=your-profile-name npx sls deploy --stage dev --region ap-northeast-1

# ドライラン（実際にデプロイしない）
AWS_PROFILE=your-profile-name npx sls deploy --stage dev --noDeploy
```

## その他の便利コマンド

### ログ確認
```bash
# slackbot
cd slackbot && npx sls logs -f slackbot --stage dev

# backend (API)
cd backend && npx sls logs -f api --stage dev

# backend (OAuth)
cd backend && npx sls logs -f oauth --stage dev

# 特定プロファイルでのログ確認
AWS_PROFILE=your-profile-name npx sls logs -f slackbot --stage dev
```

### サービス情報確認
```bash
cd slackbot && npx sls info --stage dev
cd backend && npx sls info --stage dev

# 特定プロファイル
AWS_PROFILE=your-profile-name npx sls info --stage dev
```

### リソース削除
```bash
cd slackbot && npx sls remove --stage dev
cd backend && npx sls remove --stage dev

# 特定プロファイル
AWS_PROFILE=your-profile-name npx sls remove --stage dev
```

## 設定ファイル

Serverless Framework v4では以下の設定が追加されています：

```yaml
# serverless.yml
console: false  # ダッシュボード機能無効化
```

この設定により：
- Serverless Dashboardへの接続を無効化
- 従来通りのAWS Profile認証を使用
- デプロイログが標準出力に表示

### 📝 注意：古い設定方法について

Serverless Framework v2〜v3では以下の設定が使用されていましたが、v4では推奨されません：

```yaml
# 古い方法（v2〜v3、現在は非推奨）
org: null
app: null
```

**v4での推奨設定:**
```yaml
# 新しい方法（v4推奨）
console: false
```

## トラブルシューティング

### 認証エラーの場合
```bash
# 現在の認証情報確認
aws sts get-caller-identity

# 特定プロファイルでの確認
AWS_PROFILE=myprofile aws sts get-caller-identity
```

### 権限エラーの場合
必要なIAM権限：
- Lambda関数の作成/更新/削除
- API Gatewayの作成/更新/削除
- CloudFormationスタックの作成/更新/削除
- DynamoDBテーブルの作成/更新/削除
- IAMロールの作成（serverless-iam-roles-per-function使用時）

### デプロイ失敗時
```bash
# 詳細ログでデプロイ
npx sls deploy --stage dev --verbose

# スタック状態確認
aws cloudformation describe-stacks --stack-name service-name-stage
```
