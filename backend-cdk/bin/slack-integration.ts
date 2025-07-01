#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SlackIntegrationStack } from '../lib/slack-integration-stack';

const app = new cdk.App();

// 環境設定を取得（デフォルトは dev）
const environment = app.node.tryGetContext('env') || 'dev';
const configPath = `./config/cdkconfig.${environment}.json`;

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

new SlackIntegrationStack(app, config.stackName, {
  environment,
  config: config.environment,
});
