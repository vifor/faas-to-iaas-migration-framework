/**
 * Authentication Module
 * 
 * Configures authentication-related services, controllers, and dependencies.
 * Provides JWT configuration, password hashing, and user management functionality.
 * 
 * This module encapsulates all authentication and authorization logic,
 * including user registration, login, token management, and profile operations.
 */

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Infrastructure and repositories
import { InfrastructureModule, USER_REPOSITORY } from '../../infrastructure/infrastructure.module';

// Domain interfaces
import { IUserRepository } from '../../domain/repositories/user.repository.interface';

// Application services
import { AuthService } from '../../application/services/auth.service';

// Presentation layer
import { AuthController } from '../../presentation/controllers/auth.controller';
import { JwtAuthGuard } from '../../presentation/guards/jwt-auth.guard';
import { ApiKeyGuard } from '../../presentation/guards/api-key.guard';

@Module({
  imports: [
    // Configuration module for environment variables
    ConfigModule,
    
    // Infrastructure module provides repository implementations
    InfrastructureModule,
    
    // JWT module with dynamic configuration
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'petstore-secret-key-change-in-production'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '15m'),
          issuer: configService.get<string>('JWT_ISSUER', 'petstore-api'),
          audience: configService.get<string>('JWT_AUDIENCE', 'petstore-app'),
        },
      }),
    }),
  ],
  controllers: [
    AuthController, // Authentication REST endpoints
  ],
  providers: [
    // Authentication service
    AuthService,
    
    // Guards for authentication and authorization
    JwtAuthGuard,
    ApiKeyGuard,
    
    // Repository injection
    {
      provide: 'IUserRepository',
      useExisting: USER_REPOSITORY,
    },
  ],
  exports: [
    // Export services for use in other modules
    AuthService,
    JwtAuthGuard,
    ApiKeyGuard,
    JwtModule, // Export JWT module for passport strategies
  ],
})
export class AuthModule {
  constructor() {
    console.log('🔐 Authentication Module initialized');
  }
}