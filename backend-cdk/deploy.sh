#!/bin/bash

# CDK版 Slack通知システム デプロイスクリプト
# 環境別設定ファイルを使用してLambda環境変数を設定

set -e

# 使用方法を表示
show_usage() {
    echo "使用方法: $0 [環境] [操作]"
    echo ""
    echo "環境:"
    echo "  dev   - 開発環境"
    echo "  prod  - 本番環境"
    echo ""
    echo "操作:"
    echo "  diff    - 変更差分を表示"
    echo "  deploy  - デプロイ実行"
    echo "  destroy - スタック削除"
    echo ""
    echo "例:"
    echo "  $0 dev diff     - 開発環境の変更差分を表示"
    echo "  $0 dev deploy   - 開発環境にデプロイ"
    echo "  $0 prod deploy  - 本番環境にデプロイ"
    echo "  $0 dev destroy  - 開発環境のスタックを削除"
}

# 引数チェック
if [ $# -lt 2 ]; then
    show_usage
    exit 1
fi

ENVIRONMENT=$1
OPERATION=$2

# 環境の有効性チェック
if [ "$ENVIRONMENT" != "dev" ] && [ "$ENVIRONMENT" != "prod" ]; then
    echo "エラー: 無効な環境です。'dev' または 'prod' を指定してください。"
    exit 1
fi

# 操作の有効性チェック
if [ "$OPERATION" != "diff" ] && [ "$OPERATION" != "deploy" ] && [ "$OPERATION" != "destroy" ]; then
    echo "エラー: 無効な操作です。'diff', 'deploy', または 'destroy' を指定してください。"
    exit 1
fi

# 設定ファイルの存在確認
CONFIG_FILE="config/cdkconfig.${ENVIRONMENT}.json"
if [ ! -f "$CONFIG_FILE" ]; then
    echo "エラー: 設定ファイル $CONFIG_FILE が見つかりません。"
    echo "config/cdkconfig.example.json をコピーして作成してください。"
    exit 1
fi

echo "=== CDK版 Slack通知システム デプロイ ==="
echo "環境: $ENVIRONMENT"
echo "操作: $OPERATION"
echo "設定ファイル: $CONFIG_FILE"
echo ""

# 依存関係のインストール
echo "依存関係をインストール中..."
npm install

# CDK操作実行
case $OPERATION in
    "diff")
        echo "変更差分を表示中..."
        npx cdk diff --context env=$ENVIRONMENT
        ;;
    "deploy")
        echo "デプロイを実行中..."
        npx cdk deploy --context env=$ENVIRONMENT --require-approval never
        ;;
    "destroy")
        echo "スタックを削除中..."
        npx cdk destroy --context env=$ENVIRONMENT --force
        ;;
esac

echo ""
echo "=== $OPERATION 完了 ==="
