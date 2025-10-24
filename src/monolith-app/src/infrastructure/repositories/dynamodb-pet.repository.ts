/**
 * DynamoDB Pet Repository Implementation
 * 
 * Infrastructure adapter that implements IPetRepository interface.
 * Handles all CRUD operations for pets in DynamoDB.
 * 
 * Note: The Pet entity uses a simple ID structure and leverages
 * the existing DynamoDB service operations or simulates them using
 * the available table structure.
 * 
 * Operations Supported:
 * - Create/Update pets
 * - Find by ID, store ID, species, status
 * - Query operations for business logic
 * - Search and filtering capabilities
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IPetRepository } from '../../domain/repositories/pet.repository.interface';
import { Pet, PetStatus, PetSpecies } from '../../domain/entities/pet.entity';
import { DynamoDBService } from '../../database/dynamodb.service';

@Injectable()
export class DynamoDBPetRepository implements IPetRepository {
  private readonly logger = new Logger(DynamoDBPetRepository.name);
  private readonly tableName: string;

  constructor(
    private readonly dynamoDBService: DynamoDBService,
    private readonly configService: ConfigService,
  ) {
    // Using tenants table for pets with a specific prefix pattern
    const baseTableName = this.configService.get<string>('aws.tenantsTableName');
    const env = this.configService.get<string>('aws.env');
    this.tableName = env && env !== 'NONE' ? `${baseTableName}-${env}` : baseTableName;
    
    this.logger.log(`🐾 Pet Repository initialized for table: ${this.tableName}`);
  }

  /**
   * Create a new pet
   */
  async create(pet: Pet): Promise<Pet> {
    try {
      this.logger.debug(`Creating pet: ${pet.id}`);
      
      const item = this.toItemFormat(pet);
      
      // Use store operation with pet-specific composite key
      await this.dynamoDBService.putStore(item);
      
      this.logger.log(`✅ Created pet: ${pet.id}`);
      return pet;
    } catch (error) {
      this.logger.error(`❌ Failed to create pet ${pet.id}:`, error);
      throw new Error(`Failed to create pet: ${error.message}`);
    }
  }

  /**
   * Find a pet by its ID
   */
  async findById(id: string): Promise<Pet | null> {
    try {
      this.logger.debug(`Finding pet by ID: ${id}`);
      
      // Use composite key with pet prefix
      const item = await this.dynamoDBService.getStore('PET', id);
      
      if (!item) {
        this.logger.debug(`Pet not found: ${id}`);
        return null;
      }

      const pet = this.fromItemFormat(item);
      this.logger.debug(`✅ Found pet: ${id}`);
      return pet;
    } catch (error) {
      this.logger.error(`❌ Failed to find pet ${id}:`, error);
      throw new Error(`Failed to find pet: ${error.message}`);
    }
  }

  /**
   * Find all pets
   */
  async findAll(): Promise<Pet[]> {
    try {
      this.logger.debug('Finding all pets');
      
      // Query by partition key prefix for pets
      const result = await this.dynamoDBService.queryStores({ id: 'PET' });
      const items = result.Items || [];
      
      const pets = items.map(item => this.fromItemFormat(item));
      
      this.logger.log(`✅ Found ${pets.length} pets`);
      return pets;
    } catch (error) {
      this.logger.error('❌ Failed to find all pets:', error);
      throw new Error(`Failed to find pets: ${error.message}`);
    }
  }

  /**
   * Update an existing pet
   */
  async update(pet: Pet): Promise<Pet> {
    try {
      this.logger.debug(`Updating pet: ${pet.id}`);
      
      // Check if pet exists
      const existingPet = await this.findById(pet.id);
      if (!existingPet) {
        throw new Error(`Pet with ID ${pet.id} not found`);
      }

      // Update timestamp
      pet.updatedAt = new Date();
      
      const item = this.toItemFormat(pet);
      
      await this.dynamoDBService.putStore(item);
      
      this.logger.log(`✅ Updated pet: ${pet.id}`);
      return pet;
    } catch (error) {
      this.logger.error(`❌ Failed to update pet ${pet.id}:`, error);
      throw new Error(`Failed to update pet: ${error.message}`);
    }
  }

  /**
   * Delete a pet by ID
   */
  async delete(id: string): Promise<boolean> {
    try {
      this.logger.debug(`Deleting pet: ${id}`);
      
      // Check if pet exists
      const existingPet = await this.findById(id);
      if (!existingPet) {
        this.logger.debug(`Pet not found for deletion: ${id}`);
        return false;
      }

      await this.dynamoDBService.deleteStore('PET', id);
      
      this.logger.log(`✅ Deleted pet: ${id}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Failed to delete pet ${id}:`, error);
      throw new Error(`Failed to delete pet: ${error.message}`);
    }
  }

  /**
   * Check if a pet exists by ID
   */
  async exists(id: string): Promise<boolean> {
    try {
      const pet = await this.findById(id);
      return pet !== null;
    } catch (error) {
      this.logger.error(`❌ Failed to check pet existence ${id}:`, error);
      return false;
    }
  }

  /**
   * Find pets by store ID
   */
  async findByStoreId(storeId: string): Promise<Pet[]> {
    try {
      this.logger.debug(`Finding pets by store ID: ${storeId}`);
      
      const allPets = await this.findAll();
      const storePets = allPets.filter(pet => pet.storeId === storeId);
      
      this.logger.debug(`✅ Found ${storePets.length} pets for store: ${storeId}`);
      return storePets;
    } catch (error) {
      this.logger.error(`❌ Failed to find pets by store ID ${storeId}:`, error);
      throw new Error(`Failed to find pets by store: ${error.message}`);
    }
  }

  /**
   * Find pets by species
   */
  async findBySpecies(species: PetSpecies): Promise<Pet[]> {
    try {
      this.logger.debug(`Finding pets by species: ${species}`);
      
      const allPets = await this.findAll();
      const speciesPets = allPets.filter(pet => pet.species === species);
      
      this.logger.debug(`✅ Found ${speciesPets.length} pets of species: ${species}`);
      return speciesPets;
    } catch (error) {
      this.logger.error(`❌ Failed to find pets by species ${species}:`, error);
      throw new Error(`Failed to find pets by species: ${error.message}`);
    }
  }

  /**
   * Find pets by status
   */
  async findByStatus(status: PetStatus): Promise<Pet[]> {
    try {
      this.logger.debug(`Finding pets by status: ${status}`);
      
      const allPets = await this.findAll();
      const statusPets = allPets.filter(pet => pet.status === status);
      
      this.logger.debug(`✅ Found ${statusPets.length} pets with status: ${status}`);
      return statusPets;
    } catch (error) {
      this.logger.error(`❌ Failed to find pets by status ${status}:`, error);
      throw new Error(`Failed to find pets by status: ${error.message}`);
    }
  }

  /**
   * Find pets available for sale
   */
  async findAvailable(): Promise<Pet[]> {
    try {
      this.logger.debug('Finding available pets');
      
      return await this.findByStatus('available');
    } catch (error) {
      this.logger.error('❌ Failed to find available pets:', error);
      throw new Error(`Failed to find available pets: ${error.message}`);
    }
  }

  /**
   * Find pets by name (partial match)
   */
  async findByName(name: string): Promise<Pet[]> {
    try {
      this.logger.debug(`Finding pets by name: ${name}`);
      
      const allPets = await this.findAll();
      const matchingPets = allPets.filter(pet =>
        pet.name.toLowerCase().includes(name.toLowerCase())
      );
      
      this.logger.debug(`✅ Found ${matchingPets.length} pets matching name: ${name}`);
      return matchingPets;
    } catch (error) {
      this.logger.error(`❌ Failed to find pets by name ${name}:`, error);
      throw new Error(`Failed to find pets by name: ${error.message}`);
    }
  }

  /**
   * Find pets by breed
   */
  async findByBreed(breed: string): Promise<Pet[]> {
    try {
      this.logger.debug(`Finding pets by breed: ${breed}`);
      
      const allPets = await this.findAll();
      const breedPets = allPets.filter(pet =>
        pet.breed?.toLowerCase().includes(breed.toLowerCase())
      );
      
      this.logger.debug(`✅ Found ${breedPets.length} pets of breed: ${breed}`);
      return breedPets;
    } catch (error) {
      this.logger.error(`❌ Failed to find pets by breed ${breed}:`, error);
      throw new Error(`Failed to find pets by breed: ${error.message}`);
    }
  }

  /**
   * Find pets within a price range
   */
  async findByPriceRange(minPrice: number, maxPrice: number): Promise<Pet[]> {
    try {
      this.logger.debug(`Finding pets in price range: $${minPrice} - $${maxPrice}`);
      
      const allPets = await this.findAll();
      const pricePets = allPets.filter(pet =>
        pet.price >= minPrice && pet.price <= maxPrice
      );
      
      this.logger.debug(`✅ Found ${pricePets.length} pets in price range`);
      return pricePets;
    } catch (error) {
      this.logger.error(`❌ Failed to find pets by price range:`, error);
      throw new Error(`Failed to find pets by price range: ${error.message}`);
    }
  }

  /**
   * Get the total count of pets
   */
  async count(): Promise<number> {
    try {
      this.logger.debug('Counting all pets');
      
      const pets = await this.findAll();
      const count = pets.length;
      
      this.logger.debug(`✅ Total pet count: ${count}`);
      return count;
    } catch (error) {
      this.logger.error('❌ Failed to count pets:', error);
      throw new Error(`Failed to count pets: ${error.message}`);
    }
  }

  /**
   * Get pets with pagination
   */
  async findWithPagination(
    limit: number,
    lastKey?: Record<string, any>,
  ): Promise<{
    pets: Pet[];
    lastEvaluatedKey?: Record<string, any>;
    hasMore: boolean;
  }> {
    try {
      this.logger.debug(`Finding pets with pagination: limit=${limit}`);
      
      const result = await this.dynamoDBService.queryStores({
        id: 'PET',
        limit,
        exclusiveStartKey: lastKey,
      });
      
      const items = result.Items || [];
      const pets = items.map(item => this.fromItemFormat(item));
      
      const response = {
        pets,
        lastEvaluatedKey: result.LastEvaluatedKey,
        hasMore: !!result.LastEvaluatedKey,
      };
      
      this.logger.debug(`✅ Found ${pets.length} pets with pagination`);
      return response;
    } catch (error) {
      this.logger.error('❌ Failed to find pets with pagination:', error);
      throw new Error(`Failed to find pets with pagination: ${error.message}`);
    }
  }

  /**
   * Find pets by store and status
   */
  async findByStoreAndStatus(storeId: string, status: PetStatus): Promise<Pet[]> {
    try {
      this.logger.debug(`Finding pets by store ${storeId} and status ${status}`);
      
      const storePets = await this.findByStoreId(storeId);
      const filteredPets = storePets.filter(pet => pet.status === status);
      
      this.logger.debug(`✅ Found ${filteredPets.length} pets for store ${storeId} with status ${status}`);
      return filteredPets;
    } catch (error) {
      this.logger.error(`❌ Failed to find pets by store and status:`, error);
      throw new Error(`Failed to find pets by store and status: ${error.message}`);
    }
  }

  /**
   * Find pets by store and species
   */
  async findByStoreAndSpecies(storeId: string, species: PetSpecies): Promise<Pet[]> {
    try {
      this.logger.debug(`Finding pets by store ${storeId} and species ${species}`);
      
      const storePets = await this.findByStoreId(storeId);
      const filteredPets = storePets.filter(pet => pet.species === species);
      
      this.logger.debug(`✅ Found ${filteredPets.length} pets for store ${storeId} with species ${species}`);
      return filteredPets;
    } catch (error) {
      this.logger.error(`❌ Failed to find pets by store and species:`, error);
      throw new Error(`Failed to find pets by store and species: ${error.message}`);
    }
  }

  /**
   * Find pets by age range (in months)
   */
  async findByAgeRange(minAge: number, maxAge: number): Promise<Pet[]> {
    try {
      this.logger.debug(`Finding pets by age range: ${minAge}-${maxAge} months`);
      
      const allPets = await this.findAll();
      const agePets = allPets.filter(pet =>
        pet.age !== undefined && pet.age >= minAge && pet.age <= maxAge
      );
      
      this.logger.debug(`✅ Found ${agePets.length} pets in age range`);
      return agePets;
    } catch (error) {
      this.logger.error(`❌ Failed to find pets by age range:`, error);
      throw new Error(`Failed to find pets by age range: ${error.message}`);
    }
  }

  /**
   * Get the count of pets in a specific store
   */
  async countByStore(storeId: string): Promise<number> {
    try {
      this.logger.debug(`Counting pets in store: ${storeId}`);
      
      const storePets = await this.findByStoreId(storeId);
      const count = storePets.length;
      
      this.logger.debug(`✅ Store ${storeId} has ${count} pets`);
      return count;
    } catch (error) {
      this.logger.error(`❌ Failed to count pets in store ${storeId}:`, error);
      throw new Error(`Failed to count pets in store: ${error.message}`);
    }
  }

  /**
   * Search pets with multiple filters
   */
  async findWithFilters(filters: {
    storeId?: string;
    status?: PetStatus;
    species?: PetSpecies;
    breed?: string;
    minPrice?: number;
    maxPrice?: number;
    minAge?: number;
    maxAge?: number;
  }): Promise<Pet[]> {
    try {
      this.logger.debug('Finding pets with filters:', filters);
      
      let pets = await this.findAll();
      
      // Apply filters sequentially
      if (filters.storeId) {
        pets = pets.filter(pet => pet.storeId === filters.storeId);
      }
      
      if (filters.status) {
        pets = pets.filter(pet => pet.status === filters.status);
      }
      
      if (filters.species) {
        pets = pets.filter(pet => pet.species === filters.species);
      }
      
      if (filters.breed) {
        pets = pets.filter(pet =>
          pet.breed?.toLowerCase().includes(filters.breed!.toLowerCase())
        );
      }
      
      if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
        pets = pets.filter(pet => {
          if (pet.price === undefined) return false;
          if (filters.minPrice !== undefined && pet.price < filters.minPrice) return false;
          if (filters.maxPrice !== undefined && pet.price > filters.maxPrice) return false;
          return true;
        });
      }
      
      if (filters.minAge !== undefined || filters.maxAge !== undefined) {
        pets = pets.filter(pet => {
          if (pet.age === undefined) return false;
          if (filters.minAge !== undefined && pet.age < filters.minAge) return false;
          if (filters.maxAge !== undefined && pet.age > filters.maxAge) return false;
          return true;
        });
      }
      
      this.logger.debug(`✅ Found ${pets.length} pets matching filters`);
      return pets;
    } catch (error) {
      this.logger.error('❌ Failed to find pets with filters:', error);
      throw new Error(`Failed to find pets with filters: ${error.message}`);
    }
  }

  /**
   * Get low stock pets (inventory management) - removed as not part of Pet entity
   */
  async findLowStock(threshold: number = 5): Promise<Pet[]> {
    try {
      this.logger.debug(`Finding low stock pets (threshold: ${threshold})`);
      
      // Since Pet entity doesn't have inventory count, return empty array
      // This could be implemented differently based on business logic
      this.logger.debug('✅ No inventory tracking on Pet entity');
      return [];
    } catch (error) {
      this.logger.error('❌ Failed to find low stock pets:', error);
      throw new Error(`Failed to find low stock pets: ${error.message}`);
    }
  }

  /**
   * Update pet status
   */
  async updateStatus(id: string, status: PetStatus): Promise<Pet> {
    try {
      this.logger.debug(`Updating pet status: ${id} -> ${status}`);
      
      const pet = await this.findById(id);
      if (!pet) {
        throw new Error(`Pet with ID ${id} not found`);
      }

      pet.updateStatus(status);
      
      return await this.update(pet);
    } catch (error) {
      this.logger.error(`❌ Failed to update pet status ${id}:`, error);
      throw new Error(`Failed to update pet status: ${error.message}`);
    }
  }

  /**
   * Update pet inventory count - removed as not part of Pet entity
   */
  async updateInventoryCount(id: string, count: number): Promise<Pet> {
    try {
      this.logger.debug(`Inventory count not supported on Pet entity`);
      
      const pet = await this.findById(id);
      if (!pet) {
        throw new Error(`Pet with ID ${id} not found`);
      }

      // Pet entity doesn't have inventory count, just return unchanged pet
      return pet;
    } catch (error) {
      this.logger.error(`❌ Failed to update pet inventory ${id}:`, error);
      throw new Error(`Failed to update pet inventory: ${error.message}`);
    }
  }

  /**
   * Convert Pet entity to DynamoDB item format
   */
  private toItemFormat(pet: Pet): Record<string, any> {
    const item: Record<string, any> = {
      id: 'PET', // Partition key prefix for pets
      value: pet.id, // Sort key is the actual pet ID
      petId: pet.id, // Store actual pet ID as attribute
      name: pet.name,
      species: pet.species,
      status: pet.status,
      storeId: pet.storeId,
      createdAt: pet.createdAt.toISOString(),
      updatedAt: pet.updatedAt.toISOString(),
    };

    // Add optional fields only if they exist
    if (pet.breed) item.breed = pet.breed;
    if (pet.age !== undefined) item.age = pet.age;
    if (pet.price !== undefined) item.price = pet.price;
    if (pet.description) item.description = pet.description;
    if (pet.healthStatus) item.healthStatus = pet.healthStatus;
    if (pet.vaccination !== undefined) item.vaccination = pet.vaccination;
    if (pet.neutered !== undefined) item.neutered = pet.neutered;
    if (pet.color) item.color = pet.color;
    if (pet.size) item.size = pet.size;
    if (pet.weight !== undefined) item.weight = pet.weight;

    return item;
  }

  /**
   * Convert DynamoDB item to Pet entity format
   */
  private fromItemFormat(item: Record<string, any>): Pet {
    const pet = new Pet(
      item.petId || item.value, // Use petId attribute or fallback to value
      item.name,
      item.species,
      item.storeId,
      item.breed,
      item.age,
      item.price,
      item.status || 'available',
      item.createdAt ? new Date(item.createdAt) : undefined,
      item.updatedAt ? new Date(item.updatedAt) : undefined,
    );

    // Set additional optional properties
    if (item.description) pet.description = item.description;
    if (item.healthStatus) pet.healthStatus = item.healthStatus;
    if (item.vaccination !== undefined) pet.vaccination = item.vaccination;
    if (item.neutered !== undefined) pet.neutered = item.neutered;
    if (item.color) pet.color = item.color;
    if (item.size) pet.size = item.size;
    if (item.weight !== undefined) pet.weight = item.weight;

    return pet;
  }
}