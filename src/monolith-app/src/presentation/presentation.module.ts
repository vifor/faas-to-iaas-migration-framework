/**
 * Presentation Module
 * 
 * This module contains all HTTP controllers that handle REST API requests
 * for the Pet Store application. Controllers are organized by functional
 * areas and authentication requirements.
 * 
 * Controller Categories:
 * 
 * 1. Authentication Controller (Public):
 *    - AuthController: User authentication and profile management
 * 
 * 2. Admin Controllers (API Key Auth):
 *    - FranchiseAdminController: Franchise management operations
 *    - StoreAdminController: Store management operations
 * 
 * 3. Store Operation Controllers (JWT Auth):
 *    - PetStoreController: Pet management within stores
 *    - OrderStoreController: Order processing within stores
 *    - InventoryStoreController: Inventory and statistics
 * 
 * Each controller is responsible for:
 * - HTTP request/response handling
 * - Input validation and transformation
 * - Business service orchestration
 * - Error handling and status codes
 * - OpenAPI documentation
 * - Authentication/authorization integration
 */

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ApplicationModule } from '../application/application.module';

// Authentication Controller
import { AuthController } from './controllers/auth.controller';

// Admin Controllers
import { FranchiseAdminController } from './controllers/franchise-admin.controller';
import { StoreAdminController } from './controllers/store-admin.controller';

// Store Operation Controllers
import { PetStoreController } from './controllers/pet-store.controller';
import { OrderStoreController } from './controllers/order-store.controller';
import { InventoryStoreController } from './controllers/inventory-store.controller';

// Authentication Guards
import { ApiKeyGuard, JwtAuthGuard } from './guards';

@Module({
  imports: [
    ApplicationModule, // Import application services
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '24h'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [
    // Authentication Controller - Public endpoints
    AuthController,
    
    // Admin Controllers - API Key Authentication
    FranchiseAdminController,
    StoreAdminController,
    
    // Store Operation Controllers - JWT Authentication
    PetStoreController,
    OrderStoreController,
    InventoryStoreController,
  ],
  providers: [
    // Authentication guards for API protection
    ApiKeyGuard,
    JwtAuthGuard,
  ],
  exports: [
    // Export guards for use in other modules if needed
    ApiKeyGuard,
    JwtAuthGuard,
  ],
})
export class PresentationModule {
  constructor() {
    console.log('🌐 Presentation Module initialized - REST API controllers ready');
    console.log('🔐 Authentication guards configured (API Key + JWT)');
  }
}