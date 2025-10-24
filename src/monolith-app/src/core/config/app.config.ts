import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  globalPrefix: 'api/v1',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  
  // Application metadata
  name: 'PetStore Monolith',
  version: '1.0.0',
  description: 'Monolithic application migrated from AWS Lambda',
  
  // Security settings
  jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  apiKey: process.env.API_KEY || 'dev-api-key-change-in-production',
  
  // Rate limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10), // limit each IP to 100 requests per windowMs
}));

export type AppConfig = ReturnType<typeof appConfig>;