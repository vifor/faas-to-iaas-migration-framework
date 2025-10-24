import { registerAs } from '@nestjs/config';

export const awsConfig = registerAs('aws', () => ({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  
  // DynamoDB specific configuration
  dynamodb: {
    endpoint: process.env.DYNAMODB_ENDPOINT, // For local development with DynamoDB Local
    tablePrefix: process.env.DYNAMODB_TABLE_PREFIX || '',
    tableSuffix: process.env.ENV && process.env.ENV !== 'NONE' ? `-${process.env.ENV}` : '',
  },
  
  // AWS Verified Permissions (for authorization replication)
  verifiedPermissions: {
    policyStoreId: process.env.AVP_POLICY_STORE_ID,
    identitySource: process.env.AVP_IDENTITY_SOURCE,
  },
  
  // Other AWS services that might be used
  s3: {
    bucket: process.env.S3_BUCKET,
  },
  
  // CloudWatch configuration for logging
  cloudWatch: {
    logGroup: process.env.CLOUDWATCH_LOG_GROUP || '/aws/lambda/petstore-monolith',
    logStream: process.env.CLOUDWATCH_LOG_STREAM,
  },
}));

export type AwsConfig = ReturnType<typeof awsConfig>;