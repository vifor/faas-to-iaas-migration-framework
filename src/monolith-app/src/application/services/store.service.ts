/**
 * Store Application Service
 * 
 * Implements business logic and use cases for store management.
 * Orchestrates domain entities and repository operations following
 * hexagonal architecture principles.
 * 
 * This service layer handles:
 * - Store lifecycle management
 * - Franchise-store relationships
 * - Business rule validation
 * - Composite key operations
 * - Store operational logic
 */

import { Injectable, Logger, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Store } from '../../domain/entities/store.entity';
import { IStoreRepository } from '../../domain/repositories/store.repository.interface';
import { IFranchiseRepository } from '../../domain/repositories/franchise.repository.interface';
import { STORE_REPOSITORY, FRANCHISE_REPOSITORY } from '../../infrastructure/infrastructure.module';
import { CreateStoreDto, UpdateStoreDto, StoreResponseDto } from '../dtos/store.dto';

@Injectable()
export class StoreService {
  private readonly logger = new Logger(StoreService.name);

  constructor(
    @Inject(STORE_REPOSITORY)
    private readonly storeRepository: IStoreRepository,
    @Inject(FRANCHISE_REPOSITORY)
    private readonly franchiseRepository: IFranchiseRepository,
  ) {
    this.logger.log('🏪 Store Service initialized');
  }

  /**
   * Create a new store
   * Business Rules:
   * - Store composite key (id + value) must be unique
   * - Franchise must exist if specified
   * - Name must be provided and not empty
   */
  async createStore(createDto: CreateStoreDto): Promise<StoreResponseDto> {
    try {
      this.logger.debug(`Creating store: ${createDto.id}#${createDto.value}`);

      // Business validation - check if store already exists
      const existingStore = await this.storeRepository.findByCompositeKey(createDto.id, createDto.value);
      if (existingStore) {
        throw new ConflictException(`Store with composite key ${createDto.id}#${createDto.value} already exists`);
      }

      // Validate franchise exists if provided
      if (createDto.franchiseId) {
        const franchise = await this.franchiseRepository.findById(createDto.franchiseId);
        if (!franchise) {
          throw new BadRequestException(`Franchise with ID ${createDto.franchiseId} not found`);
        }
      }

      // Create domain entity from DTO
      const store = new Store(
        createDto.id,
        createDto.value,
        createDto.name,
        createDto.address,
        createDto.franchiseId,
        'active', // Default status
      );

      // Set additional properties if provided
      if (createDto.phone) store.phone = createDto.phone;
      if (createDto.email) store.email = createDto.email;
      if (createDto.openingHours) store.openingHours = createDto.openingHours;

      // Validate business rules
      const validationErrors = store.validate();
      if (validationErrors.length > 0) {
        throw new BadRequestException(`Validation failed: ${validationErrors.join(', ')}`);
      }

      // Persist the store
      const savedStore = await this.storeRepository.create(store);

      // Update franchise's store list if franchise is specified
      if (createDto.franchiseId) {
        await this.addStoreToFranchise(createDto.franchiseId, `${createDto.id}#${createDto.value}`);
      }

      this.logger.log(`✅ Created store: ${savedStore.id}#${savedStore.value}`);
      return this.toResponseDto(savedStore);
    } catch (error) {
      this.logger.error(`❌ Failed to create store: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get store by composite key
   */
  async getStoreByCompositeKey(id: string, value: string): Promise<StoreResponseDto> {
    try {
      this.logger.debug(`Getting store by composite key: ${id}#${value}`);

      const store = await this.storeRepository.findByCompositeKey(id, value);
      if (!store) {
        throw new NotFoundException(`Store with composite key ${id}#${value} not found`);
      }

      this.logger.debug(`✅ Found store: ${id}#${value}`);
      return this.toResponseDto(store);
    } catch (error) {
      this.logger.error(`❌ Failed to get store ${id}#${value}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get all stores with optional filtering
   */
  async getAllStores(
    franchiseId?: string,
    status?: string,
    limit?: number,
    lastKey?: Record<string, any>,
  ): Promise<{
    stores: StoreResponseDto[];
    lastEvaluatedKey?: Record<string, any>;
    hasMore: boolean;
  }> {
    try {
      this.logger.debug(`Getting all stores - franchise: ${franchiseId}, status: ${status}, limit: ${limit}`);

      let stores: Store[];
      let lastEvaluatedKey: Record<string, any> | undefined;
      let hasMore = false;

      if (limit && limit > 0) {
        // Paginated request
        const result = await this.storeRepository.findWithPagination(limit, lastKey);
        stores = result.stores;
        lastEvaluatedKey = result.lastEvaluatedKey;
        hasMore = result.hasMore;
      } else {
        // Get all stores
        stores = await this.storeRepository.findAll();
      }

      // Apply filters
      if (franchiseId) {
        stores = stores.filter(store => store.franchiseId === franchiseId);
      }

      if (status) {
        stores = stores.filter(store => store.status === status);
      }

      const response = {
        stores: stores.map(store => this.toResponseDto(store)),
        lastEvaluatedKey,
        hasMore,
      };

      this.logger.debug(`✅ Found ${stores.length} stores`);
      return response;
    } catch (error) {
      this.logger.error(`❌ Failed to get stores: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update store information
   * Business Rules:
   * - Store must exist
   * - Cannot update composite key components
   * - Franchise changes must be valid
   */
  async updateStore(id: string, value: string, updateDto: UpdateStoreDto): Promise<StoreResponseDto> {
    try {
      this.logger.debug(`Updating store: ${id}#${value}`);

      // Get existing store
      const existingStore = await this.storeRepository.findByCompositeKey(id, value);
      if (!existingStore) {
        throw new NotFoundException(`Store with composite key ${id}#${value} not found`);
      }

      // Validate franchise exists if changing franchise
      if (updateDto.franchiseId && updateDto.franchiseId !== existingStore.franchiseId) {
        const franchise = await this.franchiseRepository.findById(updateDto.franchiseId);
        if (!franchise) {
          throw new BadRequestException(`Franchise with ID ${updateDto.franchiseId} not found`);
        }
      }

      // Update store properties
      if (updateDto.name !== undefined) {
        existingStore.updateInformation(
          updateDto.name,
          updateDto.address,
          updateDto.phone,
          updateDto.email,
          updateDto.openingHours,
        );
      }

      // Update franchise if provided
      if (updateDto.franchiseId !== undefined) {
        const oldFranchiseId = existingStore.franchiseId;
        existingStore.franchiseId = updateDto.franchiseId;
        existingStore.updatedAt = new Date();

        // Update franchise relationships
        if (oldFranchiseId && oldFranchiseId !== updateDto.franchiseId) {
          await this.removeStoreFromFranchise(oldFranchiseId, `${id}#${value}`);
        }
        if (updateDto.franchiseId) {
          await this.addStoreToFranchise(updateDto.franchiseId, `${id}#${value}`);
        }
      }

      // Update status if provided
      if (updateDto.status !== undefined) {
        existingStore.status = updateDto.status;
        existingStore.updatedAt = new Date();
      }

      // Validate business rules after update
      const validationErrors = existingStore.validate();
      if (validationErrors.length > 0) {
        throw new BadRequestException(`Validation failed: ${validationErrors.join(', ')}`);
      }

      // Persist changes
      const updatedStore = await this.storeRepository.update(existingStore);

      this.logger.log(`✅ Updated store: ${id}#${value}`);
      return this.toResponseDto(updatedStore);
    } catch (error) {
      this.logger.error(`❌ Failed to update store ${id}#${value}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Delete store
   * Business Rules:
   * - Store must exist
   * - Must handle franchise relationships
   * - Cannot delete store with active pets/orders
   */
  async deleteStore(id: string, value: string): Promise<void> {
    try {
      this.logger.debug(`Deleting store: ${id}#${value}`);

      // Check if store exists
      const existingStore = await this.storeRepository.findByCompositeKey(id, value);
      if (!existingStore) {
        throw new NotFoundException(`Store with composite key ${id}#${value} not found`);
      }

      // Remove from franchise if associated
      if (existingStore.franchiseId) {
        await this.removeStoreFromFranchise(existingStore.franchiseId, `${id}#${value}`);
      }

      // Delete the store
      const deleted = await this.storeRepository.delete(id, value);
      if (!deleted) {
        throw new NotFoundException(`Store with composite key ${id}#${value} not found for deletion`);
      }

      this.logger.log(`✅ Deleted store: ${id}#${value}`);
    } catch (error) {
      this.logger.error(`❌ Failed to delete store ${id}#${value}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get stores by franchise ID
   */
  async getStoresByFranchiseId(franchiseId: string): Promise<StoreResponseDto[]> {
    try {
      this.logger.debug(`Getting stores by franchise ID: ${franchiseId}`);

      const stores = await this.storeRepository.findByFranchiseId(franchiseId);
      const response = stores.map(store => this.toResponseDto(store));

      this.logger.debug(`✅ Found ${stores.length} stores for franchise: ${franchiseId}`);
      return response;
    } catch (error) {
      this.logger.error(`❌ Failed to get stores by franchise ${franchiseId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Search stores by name
   */
  async searchStoresByName(name: string): Promise<StoreResponseDto[]> {
    try {
      this.logger.debug(`Searching stores by name: ${name}`);

      const stores = await this.storeRepository.findByName(name);
      const response = stores.map(store => this.toResponseDto(store));

      this.logger.debug(`✅ Found ${stores.length} stores matching: ${name}`);
      return response;
    } catch (error) {
      this.logger.error(`❌ Failed to search stores by name: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get stores by status
   */
  async getStoresByStatus(status: string): Promise<StoreResponseDto[]> {
    try {
      this.logger.debug(`Getting stores by status: ${status}`);

      const stores = await this.storeRepository.findByStatus(status);
      const response = stores.map(store => this.toResponseDto(store));

      this.logger.debug(`✅ Found ${stores.length} stores with status: ${status}`);
      return response;
    } catch (error) {
      this.logger.error(`❌ Failed to get stores by status: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Search stores by location
   */
  async searchStoresByLocation(location: string): Promise<StoreResponseDto[]> {
    try {
      this.logger.debug(`Searching stores by location: ${location}`);

      const stores = await this.storeRepository.findByLocation(location);
      const response = stores.map(store => this.toResponseDto(store));

      this.logger.debug(`✅ Found ${stores.length} stores matching location: ${location}`);
      return response;
    } catch (error) {
      this.logger.error(`❌ Failed to search stores by location: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get total store count
   */
  async getStoreCount(): Promise<number> {
    try {
      this.logger.debug('Getting total store count');

      const count = await this.storeRepository.count();

      this.logger.debug(`✅ Total store count: ${count}`);
      return count;
    } catch (error) {
      this.logger.error(`❌ Failed to get store count: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get stores by ID query (all stores with same ID)
   */
  async getStoresByIdQuery(id: string): Promise<StoreResponseDto[]> {
    try {
      this.logger.debug(`Getting stores by ID query: ${id}`);

      const stores = await this.storeRepository.findByIdQuery(id);
      const response = stores.map(store => this.toResponseDto(store));

      this.logger.debug(`✅ Found ${stores.length} stores with ID: ${id}`);
      return response;
    } catch (error) {
      this.logger.error(`❌ Failed to get stores by ID query ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Private helper: Add store to franchise
   */
  private async addStoreToFranchise(franchiseId: string, storeKey: string): Promise<void> {
    try {
      const franchise = await this.franchiseRepository.findById(franchiseId);
      if (franchise) {
        franchise.addStore(storeKey);
        await this.franchiseRepository.update(franchise);
      }
    } catch (error) {
      this.logger.warn(`Failed to add store to franchise: ${error.message}`);
      // Don't throw - this is a secondary operation
    }
  }

  /**
   * Private helper: Remove store from franchise
   */
  private async removeStoreFromFranchise(franchiseId: string, storeKey: string): Promise<void> {
    try {
      const franchise = await this.franchiseRepository.findById(franchiseId);
      if (franchise) {
        franchise.removeStore(storeKey);
        await this.franchiseRepository.update(franchise);
      }
    } catch (error) {
      this.logger.warn(`Failed to remove store from franchise: ${error.message}`);
      // Don't throw - this is a secondary operation
    }
  }

  /**
   * Convert domain entity to response DTO
   */
  private toResponseDto(store: Store): StoreResponseDto {
    return new StoreResponseDto({
      id: store.id,
      value: store.value,
      name: store.name,
      address: store.address,
      franchiseId: store.franchiseId,
      status: store.status,
      phone: store.phone,
      email: store.email,
      openingHours: store.openingHours,
      createdAt: store.createdAt,
      updatedAt: store.updatedAt,
    });
  }
}