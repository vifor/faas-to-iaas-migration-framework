import { registerAs } from '@nestjs/config';

export const databaseConfig = registerAs('database', () => ({
  // DynamoDB configuration matching existing FaaS setup
  dynamodb: {
    region: process.env.TABLE_REGION || process.env.AWS_REGION || 'us-east-1',
    
    // Table names matching the existing Lambda functions
    tables: {
      franchise: `petstoreFranchise${process.env.ENV && process.env.ENV !== 'NONE' ? `-${process.env.ENV}` : ''}`,
      tenants: `petstoreTenants${process.env.ENV && process.env.ENV !== 'NONE' ? `-${process.env.ENV}` : ''}`,
    },
    
    // Connection settings
    maxRetries: parseInt(process.env.DYNAMODB_MAX_RETRIES || '3', 10),
    timeout: parseInt(process.env.DYNAMODB_TIMEOUT || '30000', 10),
    
    // Local development settings
    local: {
      endpoint: process.env.DYNAMODB_LOCAL_ENDPOINT || 'http://localhost:8000',
      enabled: process.env.NODE_ENV === 'development' && process.env.USE_LOCAL_DYNAMODB === 'true',
    },
  },
  
  // Connection pool settings
  connectionPool: {
    max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    min: parseInt(process.env.DB_POOL_MIN || '2', 10),
    acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '60000', 10),
    createTimeoutMillis: parseInt(process.env.DB_CREATE_TIMEOUT || '30000', 10),
    destroyTimeoutMillis: parseInt(process.env.DB_DESTROY_TIMEOUT || '5000', 10),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '300000', 10),
    reapIntervalMillis: parseInt(process.env.DB_REAP_INTERVAL || '1000', 10),
  },
  
  // Health check configuration
  healthCheck: {
    enabled: process.env.DB_HEALTH_CHECK_ENABLED !== 'false',
    timeout: parseInt(process.env.DB_HEALTH_CHECK_TIMEOUT || '5000', 10),
    interval: parseInt(process.env.DB_HEALTH_CHECK_INTERVAL || '30000', 10),
  },
}));

export type DatabaseConfig = ReturnType<typeof databaseConfig>;