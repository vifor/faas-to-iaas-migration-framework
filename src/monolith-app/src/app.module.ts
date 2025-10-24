import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './core/health/health.controller';
import { appConfig } from './core/config/app.config';
import { awsConfig } from './core/config/aws.config';
import { databaseConfig } from './core/config/database.config';
import { DatabaseModule } from './database/database.module';
import { PresentationModule } from './presentation/presentation.module';
import { AuthModule } from './application/modules/auth.module';

@Module({
  imports: [
    // Configuration module with environment validation
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, awsConfig, databaseConfig],
      envFilePath: [
        `.env.${process.env.NODE_ENV || 'development'}.local`,
        `.env.${process.env.NODE_ENV || 'development'}`,
        '.env.local',
        '.env',
      ],
      validate: (config) => {
        // Basic validation - can be expanded with joi or class-validator
        const requiredVars = ['PORT', 'NODE_ENV'];
        const missing = requiredVars.filter(key => !config[key]);
        
        if (missing.length > 0) {
          console.warn(`Missing environment variables: ${missing.join(', ')} - using defaults`);
        }
        
        return config;
      },
    }),
    
    // Database module for DynamoDB connection
    DatabaseModule,
    
    // Authentication module for user management and JWT tokens
    AuthModule,
    
    // Presentation layer with REST API controllers
    PresentationModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {
  constructor() {
    console.log('🏗️  AppModule initialized');
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  }
}