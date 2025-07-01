import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface DynamoStackProps extends cdk.StackProps {
  tableName: string;
  projectName: string;
  environment: string;
}

export class DynamoStack extends Construct {
  public readonly table: dynamodb.Table;
  public readonly lambdaRole: iam.Role;

  constructor(scope: Construct, id: string, props: DynamoStackProps) {
    super(scope, id);

    // DynamoDB テーブル作成
    this.table = new dynamodb.Table(this, 'SlackIntegrationsTable', {
      tableName: props.tableName,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // 開発用設定
      pointInTimeRecovery: false, // 開発用設定
    });

    // Lambda実行用IAMロール
    this.lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
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
              resources: [this.table.tableArn],
            }),
          ],
        }),
      },
    });

    // タグ設定
    cdk.Tags.of(this.table).add('Name', `${props.projectName}-dynamodb-table`);
    cdk.Tags.of(this.table).add('Environment', props.environment);
    cdk.Tags.of(this.lambdaRole).add('Name', `${props.projectName}-lambda-role`);
    cdk.Tags.of(this.lambdaRole).add('Environment', props.environment);
  }
}
