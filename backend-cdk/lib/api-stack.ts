import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime, Architecture } from 'aws-cdk-lib/aws-lambda';
import { LambdaRestApi, RestApi, LambdaIntegration, Cors } from 'aws-cdk-lib/aws-apigateway';
import { OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import { PolicyStatement, Effect, ManagedPolicy, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export interface ApiStackProps extends cdk.StackProps {
  environment: string;
  projectName: string;
  config: {
    DYNAMODB_TABLE: string;
    DYNAMODB_REGION: string;
    SLACK_CLIENT_ID: string;
    SLACK_CLIENT_SECRET: string;
    SLACK_SIGNING_SECRET: string;
    SLACK_REDIRECT_URI: string;
    SLACK_STATE_SECRET: string;
    SLACK_BOT_TOKEN: string;
  };
  // Cross-Stack References
  tableArn: string;
  tableName: string;
}

export class ApiStack extends cdk.Stack {
  public readonly backendApi: LambdaRestApi;
  public readonly slackbotApi: LambdaRestApi;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const { config } = props;

    // Lambda execution role with DynamoDB permissions (Optimized)
    const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // DynamoDB access policy with simplified syntax
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
        `${props.tableArn}/index/*`, // GSI対応
      ],
    });

    lambdaRole.addToPolicy(dynamoPolicy);

    // Reusable Log Group factory
    const createLogGroup = (name: string) => new LogGroup(this, `${name}LogGroup`, {
      logGroupName: `/aws/lambda/${props.projectName}-${props.environment}-${name}`,
      retention: RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // API Lambda Function with NodejsFunction
    const apiFunction = new NodejsFunction(this, 'ApiFunction', {
      entry: './lambda/api/app.js',
      runtime: Runtime.NODEJS_22_X,
      architecture: Architecture.X86_64,
      environment: {
        DYNAMODB_TABLE: props.tableName,
        DYNAMODB_REGION: config.DYNAMODB_REGION,
        SLACK_SIGNING_SECRET: config.SLACK_SIGNING_SECRET,
      },
      role: lambdaRole,
      logGroup: createLogGroup('api'),
      bundling: {
        minify: true,
        sourceMap: true,
        target: 'node22',
        format: OutputFormat.ESM,
        esbuildArgs: {
          '--platform': 'node',
          '--tree-shaking': true,
          '--keep-names': true,
        },
        // AWS SDK v3は自動で外部化される
        externalModules: ['@aws-sdk/*'],
      },
    });

    // OAuth Lambda Function with NodejsFunction
    const oauthFunction = new NodejsFunction(this, 'OAuthFunction', {
      entry: './lambda/oauth/oauth.js',
      runtime: Runtime.NODEJS_22_X,
      architecture: Architecture.X86_64,
      environment: {
        DYNAMODB_TABLE: props.tableName,
        DYNAMODB_REGION: config.DYNAMODB_REGION,
        SLACK_CLIENT_ID: config.SLACK_CLIENT_ID,
        SLACK_CLIENT_SECRET: config.SLACK_CLIENT_SECRET,
        SLACK_REDIRECT_URI: config.SLACK_REDIRECT_URI,
      },
      role: lambdaRole,
      logGroup: createLogGroup('oauth'),
      bundling: {
        minify: true,
        sourceMap: true,
        target: 'node22',
        format: OutputFormat.ESM,
        esbuildArgs: {
          '--platform': 'node',
          '--tree-shaking': true,
          '--keep-names': true,
        },
        externalModules: ['@aws-sdk/*'],
      },
    });

    // SlackBot Lambda Function with NodejsFunction
    const slackbotFunction = new NodejsFunction(this, 'SlackBotFunction', {
      entry: './lambda/slackbot/bot.js',
      runtime: Runtime.NODEJS_22_X,
      architecture: Architecture.X86_64,
      environment: {
        DYNAMODB_TABLE: props.tableName,
        DYNAMODB_REGION: config.DYNAMODB_REGION,
        SLACK_CLIENT_ID: config.SLACK_CLIENT_ID,
        SLACK_CLIENT_SECRET: config.SLACK_CLIENT_SECRET,
        SLACK_SIGNING_SECRET: config.SLACK_SIGNING_SECRET,
        SLACK_STATE_SECRET: config.SLACK_STATE_SECRET,
        SLACK_BOT_TOKEN: config.SLACK_BOT_TOKEN,
      },
      role: lambdaRole,
      logGroup: createLogGroup('slackbot'),
      bundling: {
        minify: true,
        sourceMap: true,
        target: 'node22',
        format: OutputFormat.ESM,
        esbuildArgs: {
          '--platform': 'node',
          '--tree-shaking': true,
          '--keep-names': true,
        },
        externalModules: ['@aws-sdk/*'],
      },
    });

    // Backend API Gateway with LambdaRestApi high-level construct
    this.backendApi = new LambdaRestApi(this, 'BackendApi', {
      handler: apiFunction,
      restApiName: `${props.projectName}-${props.environment}-backend-api`,
      description: 'Slack Integration Backend API (Frontend用)',
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    // SlackBot API Gateway with LambdaRestApi high-level construct (独立)
    this.slackbotApi = new LambdaRestApi(this, 'SlackBotApi', {
      handler: slackbotFunction,
      restApiName: `${props.projectName}-${props.environment}-slackbot-api`,
      description: 'Slack Integration SlackBot API (Slack Webhook用)',
    });

    // 注意: LambdaRestApiは自動的にAPIGateway統合を設定するため、
    // 手動でのルート設定やIntegrationの定義は不要です

    // OAuth用の追加APIを作成 (異なるLambda関数のため)
    const oauthApi = new LambdaRestApi(this, 'OAuthApi', {
      handler: oauthFunction,
      restApiName: `${props.projectName}-${props.environment}-oauth-api`,
      description: 'Slack OAuth API',
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    // タグ設定
    cdk.Tags.of(this).add('Component', 'API');
    cdk.Tags.of(this).add('Environment', props.environment);
    cdk.Tags.of(this).add('Project', props.projectName);

        // Outputs
    new cdk.CfnOutput(this, 'BackendApiUrl', {
      value: this.backendApi.url,
      description: 'Backend API Gateway URL',
    });

    new cdk.CfnOutput(this, 'OAuthApiUrl', {
      value: oauthApi.url,
      description: 'OAuth API Gateway URL',
    });

    new cdk.CfnOutput(this, 'SlackBotApiUrl', {
      value: this.slackbotApi.url,
      description: 'SlackBot API Gateway URL',
    });

    new cdk.CfnOutput(this, 'SlackRedirectUri', {
      value: `${this.backendApi.url}slack/oauth/callback`,
      description: 'Slack OAuth Redirect URI (設定に使用)',
    });

    new cdk.CfnOutput(this, 'SlackEventsUrl', {
      value: `${this.slackbotApi.url}slack/events`,
      description: 'Slack Events Request URL (Slackアプリ設定用)',
    });
  }
}
