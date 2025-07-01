import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import * as fs from 'fs';
import * as yaml from 'js-yaml';

// 機密設定ファイルを読み込む関数
function loadSecrets(): any {
  try {
    const secretsPath = './config/secrets.yml';
    const fileContents = fs.readFileSync(secretsPath, 'utf8');
    return yaml.load(fileContents);
  } catch (error) {
    console.error('secrets.ymlファイルが見つかりません。config/secrets.example.ymlをコピーして作成してください。');
    process.exit(1);
  }
}

export class SlackIntegrationStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 機密設定ファイルの読み込み
    const secrets = loadSecrets();

    // DynamoDB Table
    const table = new dynamodb.Table(this, 'SlackIntegrationsTable', {
      tableName: secrets.DYNAMODB_TABLE || 'SlackIntegrations',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // 開発用設定
    });

    // Lambda execution role with DynamoDB permissions
    const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
      inlinePolicies: {
        DynamoDBAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'dynamodb:Query',
                'dynamodb:GetItem',
                'dynamodb:PutItem',
                'dynamodb:DeleteItem',
                'dynamodb:Scan',
              ],
              resources: [table.tableArn],
            }),
          ],
        }),
      },
    });

    // API Lambda Function
    const apiFunction = new lambda.Function(this, 'ApiFunction', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'app.handler',
      code: lambda.Code.fromAsset('./lambda/api', {
        bundling: {
          image: lambda.Runtime.NODEJS_22_X.bundlingImage,
          command: [
            'bash', '-c',
            'cp -r /asset-input/* /asset-output/ && cd /asset-output && npm install --production'
          ],
        },
      }),
      environment: {
        DYNAMODB_TABLE: table.tableName,
        DYNAMODB_REGION: props?.env?.region || 'ap-northeast-1',
        SLACK_SIGNING_SECRET: secrets.SLACK_SIGNING_SECRET || '',
      },
      role: lambdaRole,
      logGroup: new logs.LogGroup(this, 'ApiLogGroup', {
        logGroupName: `/aws/lambda/slack-integration-api`,
        retention: logs.RetentionDays.ONE_WEEK,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
    });

    // OAuth Lambda Function
    const oauthFunction = new lambda.Function(this, 'OAuthFunction', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'oauth.handler',
      code: lambda.Code.fromAsset('./lambda/oauth', {
        bundling: {
          image: lambda.Runtime.NODEJS_22_X.bundlingImage,
          command: [
            'bash', '-c',
            'cp -r /asset-input/* /asset-output/ && cd /asset-output && npm install --production'
          ],
        },
      }),
      environment: {
        DYNAMODB_TABLE: table.tableName,
        DYNAMODB_REGION: props?.env?.region || 'ap-northeast-1',
        SLACK_CLIENT_ID: secrets.SLACK_CLIENT_ID || '',
        SLACK_CLIENT_SECRET: secrets.SLACK_CLIENT_SECRET || '',
        SLACK_REDIRECT_URI: secrets.SLACK_REDIRECT_URI || '',
      },
      role: lambdaRole,
      logGroup: new logs.LogGroup(this, 'OAuthLogGroup', {
        logGroupName: `/aws/lambda/slack-integration-oauth`,
        retention: logs.RetentionDays.ONE_WEEK,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
    });

    // SlackBot Lambda Function
    const slackbotFunction = new lambda.Function(this, 'SlackBotFunction', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'bot.handler',
      code: lambda.Code.fromAsset('./lambda/slackbot', {
        bundling: {
          image: lambda.Runtime.NODEJS_22_X.bundlingImage,
          command: [
            'bash', '-c',
            'cp -r /asset-input/* /asset-output/ && cd /asset-output && npm install --production'
          ],
        },
      }),
      environment: {
        DYNAMODB_TABLE: table.tableName,
        DYNAMODB_REGION: props?.env?.region || 'ap-northeast-1',
        SLACK_CLIENT_ID: secrets.SLACK_CLIENT_ID || '',
        SLACK_CLIENT_SECRET: secrets.SLACK_CLIENT_SECRET || '',
        SLACK_SIGNING_SECRET: secrets.SLACK_SIGNING_SECRET || '',
        SLACK_STATE_SECRET: secrets.SLACK_STATE_SECRET || '',
        SLACK_BOT_TOKEN: secrets.SLACK_BOT_TOKEN || '',
      },
      role: lambdaRole,
      logGroup: new logs.LogGroup(this, 'SlackBotLogGroup', {
        logGroupName: `/aws/lambda/slack-integration-slackbot`,
        retention: logs.RetentionDays.ONE_WEEK,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
    });

    // API Gateway
    const api = new apigateway.RestApi(this, 'SlackIntegrationApi', {
      restApiName: 'Slack Integration API',
      description: 'CDK版 Slack Integration Backend API',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    // API Gateway integrations
    const apiIntegration = new apigateway.LambdaIntegration(apiFunction);
    const oauthIntegration = new apigateway.LambdaIntegration(oauthFunction);
    const slackbotIntegration = new apigateway.LambdaIntegration(slackbotFunction);

    // API routes
    api.root.addProxy({
      defaultIntegration: apiIntegration,
      anyMethod: true,
    });

    // Slack OAuth routes
    const slackResource = api.root.addResource('slack');
    const oauthResource = slackResource.addResource('oauth');
    oauthResource.addProxy({
      defaultIntegration: oauthIntegration,
      anyMethod: true,
    });

    // SlackBot events routes
    const eventsResource = slackResource.addResource('events');
    eventsResource.addMethod('POST', slackbotIntegration);

    // Outputs
    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: api.url,
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'DynamoDBTableName', {
      value: table.tableName,
      description: 'DynamoDB Table Name',
    });

    new cdk.CfnOutput(this, 'SlackRedirectUri', {
      value: `${api.url}slack/oauth/callback`,
      description: 'Slack OAuth Redirect URI (設定に使用)',
    });
  }
}
