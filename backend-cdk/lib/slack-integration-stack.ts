import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export class SlackIntegrationStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB Table
    const table = new dynamodb.Table(this, 'SlackIntegrationsTable', {
      tableName: 'SlackIntegrations',
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
      code: lambda.Code.fromAsset('../backend', {
        exclude: ['node_modules', 'serverless.yml'],
      }),
      environment: {
        DYNAMODB_TABLE: table.tableName,
        DYNAMODB_REGION: this.region,
        SLACK_SIGNING_SECRET: process.env.SLACK_SIGNING_SECRET || '',
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
      code: lambda.Code.fromAsset('../backend', {
        exclude: ['node_modules', 'serverless.yml'],
      }),
      environment: {
        DYNAMODB_TABLE: table.tableName,
        DYNAMODB_REGION: this.region,
        SLACK_CLIENT_ID: process.env.SLACK_CLIENT_ID || '',
        SLACK_CLIENT_SECRET: process.env.SLACK_CLIENT_SECRET || '',
        SLACK_REDIRECT_URI: process.env.SLACK_REDIRECT_URI || '',
      },
      role: lambdaRole,
      logGroup: new logs.LogGroup(this, 'OAuthLogGroup', {
        logGroupName: `/aws/lambda/slack-integration-oauth`,
        retention: logs.RetentionDays.ONE_WEEK,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
    });

    // API Gateway
    const api = new apigateway.RestApi(this, 'SlackIntegrationApi', {
      restApiName: 'Slack Integration API',
      description: 'API for Slack Integration Backend',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    // API Gateway integrations
    const apiIntegration = new apigateway.LambdaIntegration(apiFunction);
    const oauthIntegration = new apigateway.LambdaIntegration(oauthFunction);

    // API routes
    api.root.addProxy({
      defaultIntegration: apiIntegration,
      anyMethod: true,
    });

    const slackResource = api.root.addResource('slack');
    const oauthResource = slackResource.addResource('oauth');
    oauthResource.addProxy({
      defaultIntegration: oauthIntegration,
      anyMethod: true,
    });

    // Outputs
    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: api.url,
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'DynamoDBTableName', {
      value: table.tableName,
      description: 'DynamoDB Table Name',
    });
  }
}
