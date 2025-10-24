import { registerAs } from '@nestjs/config';

export const awsConfig = registerAs('aws', () => ({
  region: process.env.AWS_REGION || process.env.TABLE_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  
  // Environment configuration matching Lambda function pattern
  env: process.env.ENV || 'development',
  
  // DynamoDB specific configuration
  dynamodb: {
    endpoint: process.env.DYNAMODB_ENDPOINT || process.env.DYNAMODB_LOCAL_ENDPOINT, // For local development
    tablePrefix: process.env.DYNAMODB_TABLE_PREFIX || '',
    tableSuffix: process.env.ENV && process.env.ENV !== 'NONE' ? `-${process.env.ENV}` : '',
    
    // Connection settings
    maxRetries: parseInt(process.env.DYNAMODB_MAX_RETRIES || '3', 10),
    timeout: parseInt(process.env.DYNAMODB_TIMEOUT || '30000', 10),
    
    // Table names (matching existing Lambda pattern)
    tables: {
      franchise: process.env.FRANCHISE_TABLE_NAME || 'petstoreFranchise',
      tenants: process.env.TENANTS_TABLE_NAME || 'petstoreTenants',
    },
  },
  
  // AWS Verified Permissions (for authorization replication)
  verifiedPermissions: {
    policyStoreId: process.env.AVP_POLICY_STORE_ID,
    identitySource: process.env.AVP_IDENTITY_SOURCE,
    region: process.env.AVP_REGION || process.env.AWS_REGION || 'us-east-1',
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