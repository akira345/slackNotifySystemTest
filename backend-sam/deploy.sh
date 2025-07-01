#!/bin/bash

# AWS SAM 環境別デプロイスクリプト
# 使用方法: ./deploy.sh [dev|prod]

ENVIRONMENT=${1:-default}

case $ENVIRONMENT in
    dev)
        echo "🚀 開発環境にデプロイします..."
        CONFIG_FILE="samconfig.dev.toml"
        CONFIG_ENV="dev"
        
        # 開発環境の環境変数チェック
        if [[ -z "$SLACK_CLIENT_ID_DEV" || -z "$SLACK_CLIENT_SECRET_DEV" || -z "$SLACK_SIGNING_SECRET_DEV" || -z "$SLACK_REDIRECT_URI_DEV" ]]; then
            echo "❌ エラー: 以下の開発環境変数を設定してください:"
            echo "  SLACK_CLIENT_ID_DEV"
            echo "  SLACK_CLIENT_SECRET_DEV"  
            echo "  SLACK_SIGNING_SECRET_DEV"
            echo "  SLACK_REDIRECT_URI_DEV"
            echo "  SLACK_BOT_TOKEN_DEV"
            exit 1
        fi
        ;;
    prod)
        echo "🚀 本番環境にデプロイします..."
        CONFIG_FILE="samconfig.prod.toml"
        CONFIG_ENV="prod"
        
        # 本番環境の環境変数チェック
        if [[ -z "$SLACK_CLIENT_ID_PROD" || -z "$SLACK_CLIENT_SECRET_PROD" || -z "$SLACK_SIGNING_SECRET_PROD" || -z "$SLACK_REDIRECT_URI_PROD" ]]; then
            echo "❌ エラー: 以下の本番環境変数を設定してください:"
            echo "  SLACK_CLIENT_ID_PROD"
            echo "  SLACK_CLIENT_SECRET_PROD"
            echo "  SLACK_SIGNING_SECRET_PROD"  
            echo "  SLACK_REDIRECT_URI_PROD"
            echo "  SLACK_BOT_TOKEN_PROD"
            exit 1
        fi
        ;;
    default)
        echo "🚀 デフォルト環境にデプロイします..."
        CONFIG_FILE="samconfig.toml"
        CONFIG_ENV="default"
        
        # デフォルト環境の環境変数チェック
        if [[ -z "$SLACK_CLIENT_ID" || -z "$SLACK_CLIENT_SECRET" || -z "$SLACK_SIGNING_SECRET" || -z "$SLACK_REDIRECT_URI" ]]; then
            echo "❌ エラー: 以下の環境変数を設定してください:"
            echo "  SLACK_CLIENT_ID"
            echo "  SLACK_CLIENT_SECRET"
            echo "  SLACK_SIGNING_SECRET"
            echo "  SLACK_REDIRECT_URI"
            echo "  SLACK_BOT_TOKEN"
            exit 1
        fi
        ;;
    *)
        echo "❌ 無効な環境です。'dev', 'prod', または環境指定なし（default）を使用してください。"
        echo "使用方法: $0 [dev|prod]"
        exit 1
        ;;
esac

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
