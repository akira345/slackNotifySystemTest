# Deploy script for AWS SAM
#!/bin/bash

# 環境変数チェック
if [[ -z "$SLACK_CLIENT_ID" || -z "$SLACK_CLIENT_SECRET" || -z "$SLACK_SIGNING_SECRET" || -z "$SLACK_REDIRECT_URI" ]]; then
    echo "Error: Please set the following environment variables:"
    echo "  SLACK_CLIENT_ID"
    echo "  SLACK_CLIENT_SECRET"
    echo "  SLACK_SIGNING_SECRET"
    echo "  SLACK_REDIRECT_URI"
    exit 1
fi

echo "Building SAM application..."
sam build

echo "Deploying SAM application..."
sam deploy

echo "Deployment completed!"
