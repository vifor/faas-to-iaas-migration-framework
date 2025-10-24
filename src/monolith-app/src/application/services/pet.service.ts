/**
 * Pet Application Service
 * 
 * Implements business logic and use cases for pet management.
 * Orchestrates domain entities and repository operations following
 * hexagonal architecture principles.
 * 
 * This service layer handles:
 * - Pet lifecycle management
 * - Store-pet relationships
 * - Inventory management
 * - Business rule validation
 * - Pet availability operations
 */

import { Injectable, Logger, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Pet, PetStatus, PetSpecies } from '../../domain/entities/pet.entity';
import { IPetRepository } from '../../domain/repositories/pet.repository.interface';
import { IStoreRepository } from '../../domain/repositories/store.repository.interface';
import { PET_REPOSITORY, STORE_REPOSITORY } from '../../infrastructure/infrastructure.module';
import { CreatePetDto, UpdatePetDto, PetResponseDto } from '../dtos/pet.dto';

@Injectable()
export class PetService {
  private readonly logger = new Logger(PetService.name);

  constructor(
    @Inject(PET_REPOSITORY)
    private readonly petRepository: IPetRepository,
    @Inject(STORE_REPOSITORY)
    private readonly storeRepository: IStoreRepository,
  ) {
    this.logger.log('🐾 Pet Service initialized');
  }

  /**
   * Create a new pet
   * Business Rules:
   * - Pet ID will be auto-generated
   * - Species and name are required
   * - Price must be non-negative
   */
  async createPet(createDto: CreatePetDto, storeId: string): Promise<PetResponseDto> {
    try {
      this.logger.debug(`Creating pet: ${createDto.name} for store: ${storeId}`);

      // Validate store exists
      const store = await this.storeRepository.findByCompositeKey(storeId, 'main');
      if (!store) {
        throw new BadRequestException(`Store with ID ${storeId} not found`);
      }

      // Create domain entity from DTO
      const petId = this.generatePetId();
      const pet = new Pet(
        petId,
        createDto.name,
        createDto.species,
        storeId,
        createDto.breed,
        createDto.age,
        createDto.price,
        createDto.status || 'available',
      );

      // Set additional properties if provided
      if (createDto.description) pet.description = createDto.description;
      if (createDto.healthStatus) pet.healthStatus = createDto.healthStatus;
      if (createDto.color) pet.color = createDto.color;
      if (createDto.size) pet.size = createDto.size;
      if (createDto.weight !== undefined) pet.weight = createDto.weight;

      // Validate business rules
      const validationErrors = pet.validate();
      if (validationErrors.length > 0) {
        throw new BadRequestException(`Validation failed: ${validationErrors.join(', ')}`);
      }

      // Persist the pet
      const savedPet = await this.petRepository.create(pet);

      this.logger.log(`✅ Created pet: ${savedPet.id}`);
      return this.toResponseDto(savedPet);
    } catch (error) {
      this.logger.error(`❌ Failed to create pet: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get pet by ID
   */
  async getPetById(id: string): Promise<PetResponseDto> {
    try {
      this.logger.debug(`Getting pet by ID: ${id}`);

      const pet = await this.petRepository.findById(id);
      if (!pet) {
        throw new NotFoundException(`Pet with ID ${id} not found`);
      }

      this.logger.debug(`✅ Found pet: ${id}`);
      return this.toResponseDto(pet);
    } catch (error) {
      this.logger.error(`❌ Failed to get pet ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get all pets with optional filtering
   */
  async getAllPets(
    storeId?: string,
    status?: PetStatus,
    species?: PetSpecies,
    limit?: number,
    lastKey?: Record<string, any>,
  ): Promise<{
    pets: PetResponseDto[];
    lastEvaluatedKey?: Record<string, any>;
    hasMore: boolean;
  }> {
    try {
      this.logger.debug(`Getting all pets - store: ${storeId}, status: ${status}, species: ${species}, limit: ${limit}`);

      let pets: Pet[];
      let lastEvaluatedKey: Record<string, any> | undefined;
      let hasMore = false;

      if (limit && limit > 0) {
        // Paginated request
        const result = await this.petRepository.findWithPagination(limit, lastKey);
        pets = result.pets;
        lastEvaluatedKey = result.lastEvaluatedKey;
        hasMore = result.hasMore;
      } else {
        // Get all pets
        pets = await this.petRepository.findAll();
      }

      // Apply filters
      if (storeId) {
        pets = pets.filter(pet => pet.storeId === storeId);
      }

      if (status) {
        pets = pets.filter(pet => pet.status === status);
      }

      if (species) {
        pets = pets.filter(pet => pet.species === species);
      }

      const response = {
        pets: pets.map(pet => this.toResponseDto(pet)),
        lastEvaluatedKey,
        hasMore,
      };

      this.logger.debug(`✅ Found ${pets.length} pets`);
      return response;
    } catch (error) {
      this.logger.error(`❌ Failed to get pets: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update pet information
   * Business Rules:
   * - Pet must exist
   * - Cannot update to invalid state
   * - Price must remain non-negative
   */
  async updatePet(id: string, updateDto: UpdatePetDto): Promise<PetResponseDto> {
    try {
      this.logger.debug(`Updating pet: ${id}`);

      // Get existing pet
      const existingPet = await this.petRepository.findById(id);
      if (!existingPet) {
        throw new NotFoundException(`Pet with ID ${id} not found`);
      }

      // Update pet properties using entity methods
      if (updateDto.name !== undefined || updateDto.breed !== undefined || 
          updateDto.age !== undefined || updateDto.price !== undefined || 
          updateDto.description !== undefined) {
        existingPet.updateInformation(
          updateDto.name,
          updateDto.breed,
          updateDto.age,
          updateDto.price,
          updateDto.description,
        );
      }

      // Update health information
      if (updateDto.healthStatus !== undefined) {
        existingPet.updateHealthInfo(
          updateDto.healthStatus,
          undefined, // vaccination not in DTO
          undefined, // neutered not in DTO
        );
      }

      // Update physical information
      if (updateDto.color !== undefined || updateDto.size !== undefined || 
          updateDto.weight !== undefined) {
        existingPet.updatePhysicalInfo(
          updateDto.color,
          updateDto.size,
          updateDto.weight,
        );
      }

      // Update status if provided
      if (updateDto.status !== undefined) {
        existingPet.updateStatus(updateDto.status);
      }

      // Validate business rules after update
      const validationErrors = existingPet.validate();
      if (validationErrors.length > 0) {
        throw new BadRequestException(`Validation failed: ${validationErrors.join(', ')}`);
      }

      // Persist changes
      const updatedPet = await this.petRepository.update(existingPet);

      this.logger.log(`✅ Updated pet: ${id}`);
      return this.toResponseDto(updatedPet);
    } catch (error) {
      this.logger.error(`❌ Failed to update pet ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Delete pet
   * Business Rules:
   * - Pet must exist
   * - Cannot delete pet with pending orders
   */
  async deletePet(id: string): Promise<void> {
    try {
      this.logger.debug(`Deleting pet: ${id}`);

      // Check if pet exists
      const existingPet = await this.petRepository.findById(id);
      if (!existingPet) {
        throw new NotFoundException(`Pet with ID ${id} not found`);
      }

      // Business rule: Check if pet has pending orders
      if (existingPet.status === 'pending') {
        throw new ConflictException(`Cannot delete pet ${id}. Pet has pending orders.`);
      }

      // Delete the pet
      const deleted = await this.petRepository.delete(id);
      if (!deleted) {
        throw new NotFoundException(`Pet with ID ${id} not found for deletion`);
      }

      this.logger.log(`✅ Deleted pet: ${id}`);
    } catch (error) {
      this.logger.error(`❌ Failed to delete pet ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get pets by store ID
   */
  async getPetsByStoreId(storeId: string): Promise<PetResponseDto[]> {
    try {
      this.logger.debug(`Getting pets by store ID: ${storeId}`);

      const pets = await this.petRepository.findByStoreId(storeId);
      const response = pets.map(pet => this.toResponseDto(pet));

      this.logger.debug(`✅ Found ${pets.length} pets for store: ${storeId}`);
      return response;
    } catch (error) {
      this.logger.error(`❌ Failed to get pets by store ${storeId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get pets by status
   */
  async getPetsByStatus(status: PetStatus): Promise<PetResponseDto[]> {
    try {
      this.logger.debug(`Getting pets by status: ${status}`);

      const pets = await this.petRepository.findByStatus(status);
      const response = pets.map(pet => this.toResponseDto(pet));

      this.logger.debug(`✅ Found ${pets.length} pets with status: ${status}`);
      return response;
    } catch (error) {
      this.logger.error(`❌ Failed to get pets by status: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get pets by species
   */
  async getPetsBySpecies(species: PetSpecies): Promise<PetResponseDto[]> {
    try {
      this.logger.debug(`Getting pets by species: ${species}`);

      const pets = await this.petRepository.findBySpecies(species);
      const response = pets.map(pet => this.toResponseDto(pet));

      this.logger.debug(`✅ Found ${pets.length} pets of species: ${species}`);
      return response;
    } catch (error) {
      this.logger.error(`❌ Failed to get pets by species: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Search pets by name
   */
  async searchPetsByName(name: string): Promise<PetResponseDto[]> {
    try {
      this.logger.debug(`Searching pets by name: ${name}`);

      const pets = await this.petRepository.findByName(name);
      const response = pets.map(pet => this.toResponseDto(pet));

      this.logger.debug(`✅ Found ${pets.length} pets matching: ${name}`);
      return response;
    } catch (error) {
      this.logger.error(`❌ Failed to search pets by name: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get pets by breed
   */
  async getPetsByBreed(breed: string): Promise<PetResponseDto[]> {
    try {
      this.logger.debug(`Getting pets by breed: ${breed}`);

      const pets = await this.petRepository.findByBreed(breed);
      const response = pets.map(pet => this.toResponseDto(pet));

      this.logger.debug(`✅ Found ${pets.length} pets of breed: ${breed}`);
      return response;
    } catch (error) {
      this.logger.error(`❌ Failed to get pets by breed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get available pets
   */
  async getAvailablePets(): Promise<PetResponseDto[]> {
    try {
      this.logger.debug('Getting available pets');

      const pets = await this.petRepository.findByStatus('available');
      const response = pets.map(pet => this.toResponseDto(pet));

      this.logger.debug(`✅ Found ${pets.length} available pets`);
      return response;
    } catch (error) {
      this.logger.error(`❌ Failed to get available pets: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get pets by price range
   */
  async getPetsByPriceRange(minPrice: number, maxPrice: number): Promise<PetResponseDto[]> {
    try {
      this.logger.debug(`Getting pets by price range: $${minPrice} - $${maxPrice}`);

      const pets = await this.petRepository.findByPriceRange(minPrice, maxPrice);
      const response = pets.map(pet => this.toResponseDto(pet));

      this.logger.debug(`✅ Found ${pets.length} pets in price range`);
      return response;
    } catch (error) {
      this.logger.error(`❌ Failed to get pets by price range: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get pets by age range
   */
  async getPetsByAgeRange(minAge: number, maxAge: number): Promise<PetResponseDto[]> {
    try {
      this.logger.debug(`Getting pets by age range: ${minAge} - ${maxAge} months`);

      const pets = await this.petRepository.findByAgeRange(minAge, maxAge);
      const response = pets.map(pet => this.toResponseDto(pet));

      this.logger.debug(`✅ Found ${pets.length} pets in age range`);
      return response;
    } catch (error) {
      this.logger.error(`❌ Failed to get pets by age range: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update pet status
   */
  async updatePetStatus(id: string, status: PetStatus): Promise<PetResponseDto> {
    try {
      this.logger.debug(`Updating pet status: ${id} -> ${status}`);

      const pet = await this.petRepository.findById(id);
      if (!pet) {
        throw new NotFoundException(`Pet with ID ${id} not found`);
      }

      pet.updateStatus(status);
      const updatedPet = await this.petRepository.update(pet);

      this.logger.log(`✅ Updated pet status: ${id} -> ${status}`);
      return this.toResponseDto(updatedPet);
    } catch (error) {
      this.logger.error(`❌ Failed to update pet status ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Mark pet as pending (reserved)
   */
  async markPetAsPending(id: string): Promise<PetResponseDto> {
    try {
      this.logger.debug(`Marking pet as pending: ${id}`);

      const pet = await this.petRepository.findById(id);
      if (!pet) {
        throw new NotFoundException(`Pet with ID ${id} not found`);
      }

      if (!pet.isAvailable()) {
        throw new ConflictException(`Pet ${id} is not available for reservation`);
      }

      pet.markAsPending();
      const updatedPet = await this.petRepository.update(pet);

      this.logger.log(`✅ Marked pet as pending: ${id}`);
      return this.toResponseDto(updatedPet);
    } catch (error) {
      this.logger.error(`❌ Failed to mark pet as pending ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Mark pet as sold
   */
  async markPetAsSold(id: string): Promise<PetResponseDto> {
    try {
      this.logger.debug(`Marking pet as sold: ${id}`);

      const pet = await this.petRepository.findById(id);
      if (!pet) {
        throw new NotFoundException(`Pet with ID ${id} not found`);
      }

      if (!pet.isPending() && !pet.isAvailable()) {
        throw new ConflictException(`Pet ${id} is not available for sale`);
      }

      pet.markAsSold();
      const updatedPet = await this.petRepository.update(pet);

      this.logger.log(`✅ Marked pet as sold: ${id}`);
      return this.toResponseDto(updatedPet);
    } catch (error) {
      this.logger.error(`❌ Failed to mark pet as sold ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Return pet to available status
   */
  async markPetAsAvailable(id: string): Promise<PetResponseDto> {
    try {
      this.logger.debug(`Marking pet as available: ${id}`);

      const pet = await this.petRepository.findById(id);
      if (!pet) {
        throw new NotFoundException(`Pet with ID ${id} not found`);
      }

      pet.markAsAvailable();
      const updatedPet = await this.petRepository.update(pet);

      this.logger.log(`✅ Marked pet as available: ${id}`);
      return this.toResponseDto(updatedPet);
    } catch (error) {
      this.logger.error(`❌ Failed to mark pet as available ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get pet count
   */
  async getPetCount(): Promise<number> {
    try {
      this.logger.debug('Getting total pet count');

      const count = await this.petRepository.count();

      this.logger.debug(`✅ Total pet count: ${count}`);
      return count;
    } catch (error) {
      this.logger.error(`❌ Failed to get pet count: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get pet count by store
   */
  async getPetCountByStore(storeId: string): Promise<number> {
    try {
      this.logger.debug(`Getting pet count for store: ${storeId}`);

      const count = await this.petRepository.countByStore(storeId);

      this.logger.debug(`✅ Store ${storeId} has ${count} pets`);
      return count;
    } catch (error) {
      this.logger.error(`❌ Failed to get pet count for store ${storeId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Search pets with multiple filters
   */
  async searchPetsWithFilters(filters: {
    storeId?: string;
    status?: PetStatus;
    species?: PetSpecies;
    breed?: string;
    minPrice?: number;
    maxPrice?: number;
    minAge?: number;
    maxAge?: number;
  }): Promise<PetResponseDto[]> {
    try {
      this.logger.debug('Searching pets with filters:', filters);

      const pets = await this.petRepository.findWithFilters(filters);
      const response = pets.map(pet => this.toResponseDto(pet));

      this.logger.debug(`✅ Found ${pets.length} pets matching filters`);
      return response;
    } catch (error) {
      this.logger.error(`❌ Failed to search pets with filters: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Generate unique pet ID
   */
  private generatePetId(): string {
    const timestamp = Date.now();
    return `pet-${timestamp}`;
  }

  /**
   * Convert domain entity to response DTO
   */
  private toResponseDto(pet: Pet): PetResponseDto {
    return new PetResponseDto({
      id: pet.id,
      name: pet.name,
      species: pet.species,
      storeId: pet.storeId,
      breed: pet.breed,
      age: pet.age,
      price: pet.price,
      status: pet.status,
      description: pet.description,
      healthStatus: pet.healthStatus,
      vaccination: pet.vaccination,
      neutered: pet.neutered,
      color: pet.color,
      size: pet.size,
      weight: pet.weight,
      createdAt: pet.createdAt,
      updatedAt: pet.updatedAt,
    });
  }
}