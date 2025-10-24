/**
 * Franchise Application Service
 * 
 * Implements business logic and use cases for franchise management.
 * Orchestrates domain entities and repository operations following
 * hexagonal architecture principles.
 * 
 * This service layer handles:
 * - Business rule validation
 * - Use case orchestration
 * - Data transformation
 * - Transaction coordination
 * - Business logic that doesn't belong in entities
 */

import { Injectable, Logger, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Franchise } from '../../domain/entities/franchise.entity';
import { IFranchiseRepository } from '../../domain/repositories/franchise.repository.interface';
import { IStoreRepository } from '../../domain/repositories/store.repository.interface';
import { FRANCHISE_REPOSITORY, STORE_REPOSITORY } from '../../infrastructure/infrastructure.module';
import { CreateFranchiseDto, UpdateFranchiseDto, FranchiseResponseDto } from '../dtos/franchise.dto';

@Injectable()
export class FranchiseService {
  private readonly logger = new Logger(FranchiseService.name);

  constructor(
    @Inject(FRANCHISE_REPOSITORY)
    private readonly franchiseRepository: IFranchiseRepository,
    @Inject(STORE_REPOSITORY)
    private readonly storeRepository: IStoreRepository,
  ) {
    this.logger.log('🏢 Franchise Service initialized');
  }

  /**
   * Create a new franchise
   * Business Rules:
   * - Franchise ID must be unique
   * - Name must be provided and not empty
   * - Store IDs must be valid if provided
   */
  async createFranchise(createDto: CreateFranchiseDto): Promise<FranchiseResponseDto> {
    try {
      this.logger.debug(`Creating franchise: ${createDto.name}`);

      // Business validation - check if franchise already exists
      const existingFranchise = await this.franchiseRepository.findById(createDto.id);
      if (existingFranchise) {
        throw new ConflictException(`Franchise with ID ${createDto.id} already exists`);
      }

      // Create domain entity from DTO
      const franchise = new Franchise(
        createDto.id,
        createDto.name,
        createDto.location,
        createDto.stores || [],
      );

      // Validate business rules
      const validationErrors = franchise.validate();
      if (validationErrors.length > 0) {
        throw new BadRequestException(`Validation failed: ${validationErrors.join(', ')}`);
      }

      // Persist the franchise
      const savedFranchise = await this.franchiseRepository.create(franchise);

      this.logger.log(`✅ Created franchise: ${savedFranchise.id}`);
      return this.toResponseDto(savedFranchise);
    } catch (error) {
      this.logger.error(`❌ Failed to create franchise: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get franchise by ID
   */
  async getFranchiseById(id: string): Promise<FranchiseResponseDto> {
    try {
      this.logger.debug(`Getting franchise by ID: ${id}`);

      const franchise = await this.franchiseRepository.findById(id);
      if (!franchise) {
        throw new NotFoundException(`Franchise with ID ${id} not found`);
      }

      this.logger.debug(`✅ Found franchise: ${id}`);
      return this.toResponseDto(franchise);
    } catch (error) {
      this.logger.error(`❌ Failed to get franchise ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get all franchises with optional filtering
   */
  async getAllFranchises(
    limit?: number,
    lastKey?: Record<string, any>,
  ): Promise<{
    franchises: FranchiseResponseDto[];
    lastEvaluatedKey?: Record<string, any>;
    hasMore: boolean;
  }> {
    try {
      this.logger.debug(`Getting all franchises - limit: ${limit}`);

      let franchises: Franchise[];
      let lastEvaluatedKey: Record<string, any> | undefined;
      let hasMore = false;

      if (limit && limit > 0) {
        // For now, get all and implement pagination manually
        // TODO: Implement proper pagination when repository supports it
        const allFranchises = await this.franchiseRepository.findAll();
        const startIndex = lastKey?.index || 0;
        franchises = allFranchises.slice(startIndex, startIndex + limit);
        hasMore = startIndex + limit < allFranchises.length;
        if (hasMore) {
          lastEvaluatedKey = { index: startIndex + limit };
        }
      } else {
        // Get all franchises
        franchises = await this.franchiseRepository.findAll();
      }

      const response = {
        franchises: franchises.map(franchise => this.toResponseDto(franchise)),
        lastEvaluatedKey,
        hasMore,
      };

      this.logger.debug(`✅ Found ${franchises.length} franchises`);
      return response;
    } catch (error) {
      this.logger.error(`❌ Failed to get franchises: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update franchise information
   * Business Rules:
   * - Franchise must exist
   * - Cannot update to an invalid state
   */
  async updateFranchise(id: string, updateDto: UpdateFranchiseDto): Promise<FranchiseResponseDto> {
    try {
      this.logger.debug(`Updating franchise: ${id}`);

      // Get existing franchise
      const existingFranchise = await this.franchiseRepository.findById(id);
      if (!existingFranchise) {
        throw new NotFoundException(`Franchise with ID ${id} not found`);
      }

      // Update franchise properties using the entity's method
      if (updateDto.name !== undefined || updateDto.location !== undefined) {
        existingFranchise.updateInformation(updateDto.name, updateDto.location);
      }

      // Update stores if provided
      if (updateDto.stores !== undefined) {
        // Replace the stores array
        existingFranchise.stores = updateDto.stores;
        existingFranchise.updatedAt = new Date();
      }

      // Validate business rules after update
      const validationErrors = existingFranchise.validate();
      if (validationErrors.length > 0) {
        throw new BadRequestException(`Validation failed: ${validationErrors.join(', ')}`);
      }

      // Persist changes
      const updatedFranchise = await this.franchiseRepository.update(existingFranchise);

      this.logger.log(`✅ Updated franchise: ${id}`);
      return this.toResponseDto(updatedFranchise);
    } catch (error) {
      this.logger.error(`❌ Failed to update franchise ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Delete franchise
   * Business Rules:
   * - Franchise must exist
   * - Cannot delete franchise with active stores
   * - Must handle cascading effects
   */
  async deleteFranchise(id: string): Promise<void> {
    try {
      this.logger.debug(`Deleting franchise: ${id}`);

      // Check if franchise exists
      const existingFranchise = await this.franchiseRepository.findById(id);
      if (!existingFranchise) {
        throw new NotFoundException(`Franchise with ID ${id} not found`);
      }

      // Business rule: Check for dependent stores
      const stores = await this.storeRepository.findByFranchiseId(id);
      if (stores.length > 0) {
        throw new ConflictException(
          `Cannot delete franchise ${id}. It has ${stores.length} associated stores. Delete stores first.`
        );
      }

      // Delete the franchise
      const deleted = await this.franchiseRepository.delete(id);
      if (!deleted) {
        throw new NotFoundException(`Franchise with ID ${id} not found for deletion`);
      }

      this.logger.log(`✅ Deleted franchise: ${id}`);
    } catch (error) {
      this.logger.error(`❌ Failed to delete franchise ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get franchise statistics
   */
  async getFranchiseStats(id: string): Promise<{
    franchise: FranchiseResponseDto;
    storeCount: number;
    activeStores: number;
    inactiveStores: number;
  }> {
    try {
      this.logger.debug(`Getting stats for franchise: ${id}`);

      // Get franchise
      const franchise = await this.franchiseRepository.findById(id);
      if (!franchise) {
        throw new NotFoundException(`Franchise with ID ${id} not found`);
      }

      // Get store statistics
      const stores = await this.storeRepository.findByFranchiseId(id);
      const storeCount = stores.length;
      const activeStores = stores.filter(store => store.status === 'active').length;
      const inactiveStores = storeCount - activeStores;

      const stats = {
        franchise: this.toResponseDto(franchise),
        storeCount,
        activeStores,
        inactiveStores,
      };

      this.logger.debug(`✅ Generated stats for franchise: ${id}`);
      return stats;
    } catch (error) {
      this.logger.error(`❌ Failed to get franchise stats ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Search franchises by name
   */
  async searchFranchisesByName(name: string): Promise<FranchiseResponseDto[]> {
    try {
      this.logger.debug(`Searching franchises by name: ${name}`);

      const franchises = await this.franchiseRepository.findByName(name);
      const response = franchises.map(franchise => this.toResponseDto(franchise));

      this.logger.debug(`✅ Found ${franchises.length} franchises matching: ${name}`);
      return response;
    } catch (error) {
      this.logger.error(`❌ Failed to search franchises by name: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get franchises by location
   */
  async getFranchisesByLocation(location: string): Promise<FranchiseResponseDto[]> {
    try {
      this.logger.debug(`Getting franchises by location: ${location}`);

      const allFranchises = await this.franchiseRepository.findAll();
      const franchises = allFranchises.filter(franchise => 
        franchise.location?.toLowerCase().includes(location.toLowerCase())
      );
      const response = franchises.map(franchise => this.toResponseDto(franchise));

      this.logger.debug(`✅ Found ${franchises.length} franchises in location: ${location}`);
      return response;
    } catch (error) {
      this.logger.error(`❌ Failed to get franchises by location: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get total franchise count
   */
  async getFranchiseCount(): Promise<number> {
    try {
      this.logger.debug('Getting total franchise count');

      const count = await this.franchiseRepository.count();

      this.logger.debug(`✅ Total franchise count: ${count}`);
      return count;
    } catch (error) {
      this.logger.error(`❌ Failed to get franchise count: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Add store to franchise
   */
  async addStoreToFranchise(franchiseId: string, storeId: string): Promise<FranchiseResponseDto> {
    try {
      this.logger.debug(`Adding store ${storeId} to franchise: ${franchiseId}`);

      const franchise = await this.franchiseRepository.findById(franchiseId);
      if (!franchise) {
        throw new NotFoundException(`Franchise with ID ${franchiseId} not found`);
      }

      franchise.addStore(storeId);
      const updatedFranchise = await this.franchiseRepository.update(franchise);

      this.logger.log(`✅ Added store ${storeId} to franchise: ${franchiseId}`);
      return this.toResponseDto(updatedFranchise);
    } catch (error) {
      this.logger.error(`❌ Failed to add store to franchise ${franchiseId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Remove store from franchise
   */
  async removeStoreFromFranchise(franchiseId: string, storeId: string): Promise<FranchiseResponseDto> {
    try {
      this.logger.debug(`Removing store ${storeId} from franchise: ${franchiseId}`);

      const franchise = await this.franchiseRepository.findById(franchiseId);
      if (!franchise) {
        throw new NotFoundException(`Franchise with ID ${franchiseId} not found`);
      }

      franchise.removeStore(storeId);
      const updatedFranchise = await this.franchiseRepository.update(franchise);

      this.logger.log(`✅ Removed store ${storeId} from franchise: ${franchiseId}`);
      return this.toResponseDto(updatedFranchise);
    } catch (error) {
      this.logger.error(`❌ Failed to remove store from franchise ${franchiseId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Convert domain entity to response DTO
   */
  private toResponseDto(franchise: Franchise): FranchiseResponseDto {
    return new FranchiseResponseDto({
      id: franchise.id,
      name: franchise.name,
      location: franchise.location,
      stores: franchise.stores,
      createdAt: franchise.createdAt,
      updatedAt: franchise.updatedAt,
    });
  }
}