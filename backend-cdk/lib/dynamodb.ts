import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export interface DataStackProps extends cdk.StackProps {
  tableName: string;
  projectName: string;
  environment: string;
}

export class DataStack extends cdk.Stack {
  public readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, props);

    // DynamoDB テーブル作成
    this.table = new dynamodb.Table(this, 'SlackIntegrationsTable', {
      tableName: props.tableName,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      
      // 環境に応じた削除保護設定
      removalPolicy: props.environment === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
      
      // 本番環境ではバックアップ有効化
      pointInTimeRecovery: props.environment === 'prod',
    });

    // タグ設定
    cdk.Tags.of(this.table).add('Name', `${props.projectName}-dynamodb-table`);
    cdk.Tags.of(this.table).add('Environment', props.environment);
    cdk.Tags.of(this.table).add('Component', 'Data');

    // Cross-Stack Reference用の出力
    new cdk.CfnOutput(this, 'TableName', {
      value: this.table.tableName,
      exportName: `${props.projectName}-${props.environment}-table-name`,
      description: 'DynamoDB Table Name for cross-stack reference',
    });

    new cdk.CfnOutput(this, 'TableArn', {
      value: this.table.tableArn,
      exportName: `${props.projectName}-${props.environment}-table-arn`,
      description: 'DynamoDB Table ARN for cross-stack reference',
    });
  }
}
