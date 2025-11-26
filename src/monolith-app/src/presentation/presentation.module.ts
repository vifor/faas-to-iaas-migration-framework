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
import { AuthModule } from '../application/modules/auth.module';

// Admin Controllers (Auth controller is in AuthModule)
import { FranchiseAdminController } from './controllers/franchise-admin.controller';
import { StoreAdminController } from './controllers/store-admin.controller';

// Store Operation Controllers
import { PetStoreController } from './controllers/pet-store.controller';
import { OrderStoreController } from './controllers/order-store.controller';
import { InventoryStoreController } from './controllers/inventory-store.controller';

// Authorization Guard (JWT and API Key guards come from AuthModule)
import { AuthorizationGuard } from './guards/authorization.guard';

// Middleware
import { RequestLoggingMiddleware, RequestValidationMiddleware } from './middleware';

@Module({
  imports: [
    ApplicationModule, // Import application services (includes AuthorizationService)
    AuthModule, // Import authentication module with guards and services
  ],
  controllers: [
    // Admin Controllers - API Key Authentication (AuthController is in AuthModule)
    FranchiseAdminController,
    StoreAdminController,
    
    // Store Operation Controllers - JWT Authentication + Authorization
    PetStoreController,
    OrderStoreController,
    InventoryStoreController,
  ],
  providers: [
    // Authorization guard for business logic protection
    AuthorizationGuard,
    
    // Middleware for request processing
    RequestLoggingMiddleware,
    RequestValidationMiddleware,
  ],
  exports: [
    // Export authorization guard for use in other modules if needed
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