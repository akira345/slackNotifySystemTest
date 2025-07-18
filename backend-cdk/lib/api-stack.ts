import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
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
  public readonly backendApi: apigateway.RestApi;
  public readonly slackbotApi: apigateway.RestApi;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const { config } = props;

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
              resources: [
                props.tableArn,
                `${props.tableArn}/index/*`, // GSI対応
              ],
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
            'cp -au . /tmp/staging && cd /tmp/staging && npm ci --omit=dev && cp -au . /asset-output/'
          ],
          user: 'root',
        },
      }),
      environment: {
        DYNAMODB_TABLE: props.tableName,
        DYNAMODB_REGION: config.DYNAMODB_REGION,
        SLACK_SIGNING_SECRET: config.SLACK_SIGNING_SECRET,
      },
      role: lambdaRole,
      logGroup: new logs.LogGroup(this, 'ApiLogGroup', {
        logGroupName: `/aws/lambda/${props.projectName}-${props.environment}-api`,
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
            'cp -au . /tmp/staging && cd /tmp/staging && npm ci --omit=dev && cp -au . /asset-output/'
          ],
          user: 'root',
        },
      }),
      environment: {
        DYNAMODB_TABLE: props.tableName,
        DYNAMODB_REGION: config.DYNAMODB_REGION,
        SLACK_CLIENT_ID: config.SLACK_CLIENT_ID,
        SLACK_CLIENT_SECRET: config.SLACK_CLIENT_SECRET,
        SLACK_REDIRECT_URI: config.SLACK_REDIRECT_URI,
      },
      role: lambdaRole,
      logGroup: new logs.LogGroup(this, 'OAuthLogGroup', {
        logGroupName: `/aws/lambda/${props.projectName}-${props.environment}-oauth`,
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
            'cp -au . /tmp/staging && cd /tmp/staging && npm ci --omit=dev && cp -au . /asset-output/'
          ],
          user: 'root',
        },
      }),
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
      logGroup: new logs.LogGroup(this, 'SlackBotLogGroup', {
        logGroupName: `/aws/lambda/${props.projectName}-${props.environment}-slackbot`,
        retention: logs.RetentionDays.ONE_WEEK,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
    });

    // Backend API Gateway
    this.backendApi = new apigateway.RestApi(this, 'BackendApi', {
      restApiName: `${props.projectName}-${props.environment}-backend-api`,
      description: 'Slack Integration Backend API (Frontend用)',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    // SlackBot API Gateway (独立)
    this.slackbotApi = new apigateway.RestApi(this, 'SlackBotApi', {
      restApiName: `${props.projectName}-${props.environment}-slackbot-api`,
      description: 'Slack Integration SlackBot API (Slack Webhook用)',
    });

    // Backend API Gateway integrations
    const apiIntegration = new apigateway.LambdaIntegration(apiFunction);
    const oauthIntegration = new apigateway.LambdaIntegration(oauthFunction);
    
    // SlackBot API Gateway integration
    const slackbotIntegration = new apigateway.LambdaIntegration(slackbotFunction);

    // Backend API routes
    this.backendApi.root.addProxy({
      defaultIntegration: apiIntegration,
      anyMethod: true,
    });

    // Backend API - Slack OAuth routes
    const slackResource = this.backendApi.root.addResource('slack');
    const oauthResource = slackResource.addResource('oauth');
    oauthResource.addProxy({
      defaultIntegration: oauthIntegration,
      anyMethod: true,
    });

    // SlackBot API - Events routes
    const slackResource2 = this.slackbotApi.root.addResource('slack');
    const eventsResource = slackResource2.addResource('events');
    eventsResource.addMethod('POST', slackbotIntegration);

    // タグ設定
    cdk.Tags.of(this).add('Component', 'API');
    cdk.Tags.of(this).add('Environment', props.environment);
    cdk.Tags.of(this).add('Project', props.projectName);

    // Outputs
    new cdk.CfnOutput(this, 'BackendApiGatewayUrl', {
      value: this.backendApi.url,
      description: 'Backend API Gateway URL (Frontend用)',
    });

    new cdk.CfnOutput(this, 'SlackBotApiGatewayUrl', {
      value: this.slackbotApi.url,
      description: 'SlackBot API Gateway URL (Slack Webhook用)',
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
