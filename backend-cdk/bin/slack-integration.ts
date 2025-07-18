#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DataStack } from '../lib/dynamodb';
import { ApiStack } from '../lib/api-stack';

const app = new cdk.App();

// 環境設定を取得（デフォルトは dev）
const environment = app.node.tryGetContext('env') || 'dev';
const projectName = 'slack-integration';
const configPath = `../config/cdkconfig.${environment}.json`;

// 設定ファイルの読み込み
let config: any;
try {
  const allConfigs = require(configPath);
  config = allConfigs[environment];
  
  if (!config) {
    throw new Error(`環境 '${environment}' の設定が見つかりません。`);
  }
} catch (error) {
  throw new Error(`設定ファイル ${configPath} の読み込みに失敗しました: ${error}`);
}

// 1. データスタック（永続リソース）
const dataStack = new DataStack(app, `${projectName}-data-${environment}`, {
  environment,
  projectName,
  tableName: config.environment.DYNAMODB_TABLE,
});

// 2. APIスタック（アプリケーションロジック）
const apiStack = new ApiStack(app, `${projectName}-api-${environment}`, {
  environment,
  projectName,
  config: config.environment,
  
  // データスタックからの参照
  tableArn: dataStack.table.tableArn,
  tableName: dataStack.table.tableName,
});

// 依存関係の明示（CDK側で自動認識されるが明示的に設定）
// apiStack.addDependency(dataStack); // 自動認識されるためコメントアウト

// 共通タグ
cdk.Tags.of(app).add('Project', projectName);
cdk.Tags.of(app).add('Environment', environment);
cdk.Tags.of(app).add('ManagedBy', 'CDK');
