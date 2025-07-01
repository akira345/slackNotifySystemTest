#!/bin/bash

# AWS SAM 環境別デプロイスクリプト
# 使用方法: ./deploy.sh [dev|prod]

ENVIRONMENT=${1:-default}

case $ENVIRONMENT in
    dev)
        echo "🚀 開発環境にデプロイします..."
        CONFIG_FILE="samconfig.dev.toml"
        CONFIG_ENV="dev"
        ;;
    prod)
        echo "🚀 本番環境にデプロイします..."
        CONFIG_FILE="samconfig.prod.toml"
        CONFIG_ENV="prod"
        ;;
    default)
        echo "🚀 デフォルト環境にデプロイします..."
        CONFIG_FILE="samconfig.toml"
        CONFIG_ENV="default"
        ;;
    *)
        echo "❌ 無効な環境です。'dev', 'prod', または環境指定なし（default）を使用してください。"
        echo "使用方法: $0 [dev|prod]"
        exit 1
        ;;
esac

# 設定ファイルの存在確認
if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ 設定ファイル $CONFIG_FILE が見つかりません。"
    echo "サンプルファイルから設定ファイルを作成してください:"
    echo "  cp ${CONFIG_FILE%.toml}.example.toml $CONFIG_FILE"
    echo "その後、実際のSlack設定値を入力してください。"
    exit 1
fi

echo "📦 SAMアプリケーションをビルド中..."
sam build

if [ $? -ne 0 ]; then
    echo "❌ ビルドに失敗しました"
    exit 1
fi

echo "🚀 デプロイ中... (設定ファイル: $CONFIG_FILE, 環境: $CONFIG_ENV)"
sam deploy --config-env $CONFIG_ENV --config-file $CONFIG_FILE

if [ $? -eq 0 ]; then
    echo "✅ デプロイが完了しました！"
else
    echo "❌ デプロイに失敗しました"
    exit 1
fi
