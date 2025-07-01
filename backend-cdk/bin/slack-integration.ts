#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SlackIntegrationStack } from './lib/slack-integration-stack';

const app = new cdk.App();
new SlackIntegrationStack(app, 'SlackIntegrationStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'ap-northeast-1',
  },
});
