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
import { ApplicationModule } from '../application/application.module';

// Admin Controllers
import { FranchiseAdminController } from './controllers/franchise-admin.controller';
import { StoreAdminController } from './controllers/store-admin.controller';

// Store Operation Controllers
import { PetStoreController } from './controllers/pet-store.controller';
import { OrderStoreController } from './controllers/order-store.controller';
import { InventoryStoreController } from './controllers/inventory-store.controller';

// Guards
import { AuthorizationGuard } from './guards/authorization.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ApiKeyGuard } from './guards/api-key.guard';

// Middleware
import { RequestLoggingMiddleware, RequestValidationMiddleware } from './middleware';

@Module({
  imports: [
    ApplicationModule, // Import application services (includes AuthorizationService)
  ],
  controllers: [
    // Admin Controllers - API Key Authentication
    FranchiseAdminController,
    StoreAdminController,

    // Store Operation Controllers - Cognito JWT Authentication + Authorization
    PetStoreController,
    OrderStoreController,
    InventoryStoreController,
  ],
  providers: [
    // Authentication guards
    JwtAuthGuard,
    ApiKeyGuard,

    // Authorization guard for business logic protection
    AuthorizationGuard,

    // Middleware for request processing
    RequestLoggingMiddleware,
    RequestValidationMiddleware,
  ],
  exports: [
    // Export guards and authorization for use in other modules if needed
    JwtAuthGuard,
    ApiKeyGuard,
    AuthorizationGuard,
  ],
})
export class PresentationModule {
  constructor() {
    console.log('🌐 Presentation Module initialized - REST API controllers ready');
    console.log('🔐 Authentication guards configured (API Key + JWT + Authorization)');
    console.log('🛡️ Security middleware configured (Logging + Validation)');
  }
}