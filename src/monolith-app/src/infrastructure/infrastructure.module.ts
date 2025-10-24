/**
 * Infrastructure Module
 * 
 * Configures all infrastructure adapters and their dependencies.
 * Registers DynamoDB repository implementations as providers for
 * the dependency injection container.
 * 
 * This module bridges the domain layer (ports) with the infrastructure layer (adapters)
 * following the hexagonal architecture pattern.
 */

import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';

// Repository Implementations (Adapters)
import {
  DynamoDBFranchiseRepository,
  DynamoDBStoreRepository,
  DynamoDBPetRepository,
  DynamoDBOrderRepository,
  DynamoDBUserRepository,
} from './repositories';

// Repository Tokens for Dependency Injection
export const FRANCHISE_REPOSITORY = 'FRANCHISE_REPOSITORY';
export const STORE_REPOSITORY = 'STORE_REPOSITORY';
export const PET_REPOSITORY = 'PET_REPOSITORY';
export const ORDER_REPOSITORY = 'ORDER_REPOSITORY';
export const USER_REPOSITORY = 'USER_REPOSITORY';

@Module({
  imports: [
    DatabaseModule, // Provides DynamoDBService
  ],
  providers: [
    // Franchise Repository
    {
      provide: FRANCHISE_REPOSITORY,
      useClass: DynamoDBFranchiseRepository,
    },
    
    // Store Repository  
    {
      provide: STORE_REPOSITORY,
      useClass: DynamoDBStoreRepository,
    },
    
    // Pet Repository
    {
      provide: PET_REPOSITORY,
      useClass: DynamoDBPetRepository,
    },
    
    // Order Repository
    {
      provide: ORDER_REPOSITORY,
      useClass: DynamoDBOrderRepository,
    },
    
    // User Repository
    {
      provide: USER_REPOSITORY,
      useClass: DynamoDBUserRepository,
    },
  ],
  exports: [
    // Export repository tokens for injection in other modules
    FRANCHISE_REPOSITORY,
    STORE_REPOSITORY, 
    PET_REPOSITORY,
    ORDER_REPOSITORY,
    USER_REPOSITORY,
  ],
})
export class InfrastructureModule {}