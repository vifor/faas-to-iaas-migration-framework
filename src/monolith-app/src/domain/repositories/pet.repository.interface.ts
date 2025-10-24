/**
 * Pet Repository Port Interface
 * 
 * Defines the contract for pet data persistence operations.
 * Handles pet management within store contexts.
 * 
 * Part of the hexagonal architecture - this is a "port" that defines
 * what operations are needed without specifying implementation details.
 */

import { Pet, PetStatus, PetSpecies } from '../entities/pet.entity';

export interface IPetRepository {
  /**
   * Create a new pet
   * @param pet The pet entity to create
   * @returns Promise resolving to the created pet
   */
  create(pet: Pet): Promise<Pet>;

  /**
   * Find a pet by its ID
   * @param id The pet ID to search for
   * @returns Promise resolving to the pet or null if not found
   */
  findById(id: string): Promise<Pet | null>;

  /**
   * Find all pets in a specific store
   * @param storeId The store ID to search for pets
   * @returns Promise resolving to array of pets in the store
   */
  findByStoreId(storeId: string): Promise<Pet[]>;

  /**
   * Find all pets
   * @returns Promise resolving to array of all pets
   */
  findAll(): Promise<Pet[]>;

  /**
   * Update an existing pet
   * @param pet The pet entity with updated data
   * @returns Promise resolving to the updated pet
   */
  update(pet: Pet): Promise<Pet>;

  /**
   * Delete a pet by ID
   * @param id The pet ID to delete
   * @returns Promise resolving to true if deleted, false if not found
   */
  delete(id: string): Promise<boolean>;

  /**
   * Check if a pet exists
   * @param id The pet ID to check
   * @returns Promise resolving to true if exists, false otherwise
   */
  exists(id: string): Promise<boolean>;

  /**
   * Find pets by status
   * @param status The pet status to search for
   * @returns Promise resolving to array of pets with matching status
   */
  findByStatus(status: PetStatus): Promise<Pet[]>;

  /**
   * Find pets by species
   * @param species The pet species to search for
   * @returns Promise resolving to array of pets with matching species
   */
  findBySpecies(species: PetSpecies): Promise<Pet[]>;

  /**
   * Find pets by status in a specific store
   * @param storeId The store ID to search in
   * @param status The pet status to search for
   * @returns Promise resolving to array of pets matching criteria
   */
  findByStoreAndStatus(storeId: string, status: PetStatus): Promise<Pet[]>;

  /**
   * Find pets by species in a specific store
   * @param storeId The store ID to search in
   * @param species The pet species to search for
   * @returns Promise resolving to array of pets matching criteria
   */
  findByStoreAndSpecies(storeId: string, species: PetSpecies): Promise<Pet[]>;

  /**
   * Find pets by name (partial match)
   * @param name The name or partial name to search for
   * @returns Promise resolving to array of matching pets
   */
  findByName(name: string): Promise<Pet[]>;

  /**
   * Find pets by breed
   * @param breed The breed to search for
   * @returns Promise resolving to array of pets with matching breed
   */
  findByBreed(breed: string): Promise<Pet[]>;

  /**
   * Find pets within a price range
   * @param minPrice Minimum price (inclusive)
   * @param maxPrice Maximum price (inclusive)
   * @returns Promise resolving to array of pets within price range
   */
  findByPriceRange(minPrice: number, maxPrice: number): Promise<Pet[]>;

  /**
   * Find pets within an age range (in months)
   * @param minAge Minimum age in months (inclusive)
   * @param maxAge Maximum age in months (inclusive)
   * @returns Promise resolving to array of pets within age range
   */
  findByAgeRange(minAge: number, maxAge: number): Promise<Pet[]>;

  /**
   * Get the total count of pets
   * @returns Promise resolving to the total number of pets
   */
  count(): Promise<number>;

  /**
   * Get the count of pets in a specific store
   * @param storeId The store ID to count pets for
   * @returns Promise resolving to the number of pets in the store
   */
  countByStore(storeId: string): Promise<number>;

  /**
   * Get pets with pagination
   * @param limit Maximum number of pets to return
   * @param lastKey Optional last evaluated key for pagination
   * @returns Promise resolving to paginated pet results
   */
  findWithPagination(
    limit: number,
    lastKey?: Record<string, any>,
  ): Promise<{
    pets: Pet[];
    lastEvaluatedKey?: Record<string, any>;
    hasMore: boolean;
  }>;

  /**
   * Search pets with multiple filters
   * @param filters Search criteria
   * @returns Promise resolving to array of pets matching all filters
   */
  findWithFilters(filters: {
    storeId?: string;
    status?: PetStatus;
    species?: PetSpecies;
    breed?: string;
    minPrice?: number;
    maxPrice?: number;
    minAge?: number;
    maxAge?: number;
  }): Promise<Pet[]>;
}