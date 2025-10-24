import { registerAs } from '@nestjs/config';

export interface AppConfig {
  name: string;
  version: string;
  port: number;
  env: string;
  isDevelopment: boolean;
  isProduction: boolean;
  isTest: boolean;
  corsOrigin: string | string[];
  corsCredentials: boolean;
  globalPrefix: string;
  swaggerEnabled: boolean;
  swaggerPath: string;
}

export default registerAs('app', (): AppConfig => {
  const env = process.env.NODE_ENV || 'development';
  
  return {
    name: process.env.APP_NAME || 'PetStore Monolith',
    version: process.env.APP_VERSION || '1.0.0',
    port: parseInt(process.env.PORT, 10) || 3000,
    env,
    isDevelopment: env === 'development',
    isProduction: env === 'production',
    isTest: env === 'test',
    corsOrigin: process.env.CORS_ORIGIN?.split(',') || '*',
    corsCredentials: process.env.CORS_CREDENTIALS === 'true',
    globalPrefix: process.env.GLOBAL_PREFIX || 'api/v1',
    swaggerEnabled: process.env.SWAGGER_ENABLED !== 'false' && env !== 'production',
    swaggerPath: process.env.SWAGGER_PATH || 'api/docs',
  };
});