/**
 * Application Module
 * 
 * This module contains all application services that implement business logic
 * and use cases for the Pet Store application. These services coordinate
 * between the domain layer and infrastructure layer following the hexagonal
 * architecture pattern.
 * 
 * Services included:
 * - FranchiseService: Manages franchise operations and business logic
 * - StoreService: Manages store operations and relationships
 * - PetService: Manages pet inventory and business rules
 * - OrderService: Manages order processing and lifecycle
 * 
 * Each service is responsible for:
 * - Orchestrating domain entities
 * - Implementing business use cases
 * - Coordinating repository operations
 * - Validating business rules
 * - Handling error scenarios
 * - Converting between DTOs and domain entities
 */

import { Module } from '@nestjs/common';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { FranchiseService } from './services/franchise.service';
import { StoreService } from './services/store.service';
import { PetService } from './services/pet.service';
import { OrderService } from './services/order.service';
import { AuthorizationService } from './services/authorization.service';

@Module({
  imports: [
    InfrastructureModule, // Import infrastructure layer for repository implementations
  ],
  providers: [
    // Application Services
    FranchiseService,
    StoreService,
    PetService,
    OrderService,
    AuthorizationService,
  ],
  exports: [
    // Export services for use in presentation layer (controllers)
    FranchiseService,
    StoreService,
    PetService,
    OrderService,
    AuthorizationService,
  ],
})
export class ApplicationModule {
  constructor() {
    console.log('🏗️ Application Module initialized - Business services ready');
    console.log('🔐 Authorization Service included - Cedar-like policy engine ready');
  }
}