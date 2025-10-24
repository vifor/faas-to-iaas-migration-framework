import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './core/health/health.controller';
import { HealthService } from './core/health/health.service';
import { appConfig } from './core/config/app.config';
import { awsConfig } from './core/config/aws.config';
import { databaseConfig } from './core/config/database.config';

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
          throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
        }
        
        return config;
      },
    }),
    
    // Health check module
    TerminusModule,
    
    // TODO: Add feature modules here as they are implemented
    // FranchiseModule,
    // StoreModule,
    // PetModule,
    // OrderModule,
  ],
  controllers: [HealthController],
  providers: [HealthService],
})
export class AppModule {
  constructor() {
    console.log('🏗️  AppModule initialized');
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  }
}