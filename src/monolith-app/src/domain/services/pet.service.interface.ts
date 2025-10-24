/**
 * Pet Domain Service Interface
 * 
 * Defines the contract for pet business logic operations.
 * Handles pet management within store contexts.
 */

import { Pet, PetStatus, PetSpecies } from '../entities/pet.entity';

export interface IPetService {
  /**
   * Create a new pet with business rules validation
   * @param petData Pet creation data
   * @returns Promise resolving to the created pet
   */
  createPet(petData: {
    name: string;
    species: PetSpecies;
    storeId: string;
    breed?: string;
    age?: number;
    price?: number;
    description?: string;
    color?: string;
    size?: 'small' | 'medium' | 'large';
    weight?: number;
  }): Promise<Pet>;

  /**
   * Get a pet by ID
   * @param id The pet ID to retrieve
   * @returns Promise resolving to the pet or null if not found
   */
  getPetById(id: string): Promise<Pet | null>;

  /**
   * Get all pets in a store
   * @param storeId The store ID to search for pets
   * @returns Promise resolving to array of pets in the store
   */
  getPetsByStore(storeId: string): Promise<Pet[]>;

  /**
   * Get all pets
   * @returns Promise resolving to array of all pets
   */
  getAllPets(): Promise<Pet[]>;

  /**
   * Update pet information
   * @param id The pet ID to update
   * @param updateData Data to update
   * @returns Promise resolving to the updated pet
   */
  updatePet(
    id: string,
    updateData: {
      name?: string;
      breed?: string;
      age?: number;
      price?: number;
      description?: string;
      color?: string;
      size?: 'small' | 'medium' | 'large';
      weight?: number;
      healthStatus?: string;
      vaccination?: boolean;
      neutered?: boolean;
    },
  ): Promise<Pet>;

  /**
   * Delete a pet
   * @param id The pet ID to delete
   * @returns Promise resolving to true if deleted successfully
   */
  deletePet(id: string): Promise<boolean>;

  /**
   * Update pet status
   * @param id The pet ID
   * @param status The new status
   * @returns Promise resolving to the updated pet
   */
  updatePetStatus(id: string, status: PetStatus): Promise<Pet>;

  /**
   * Search pets by name
   * @param name The name or partial name to search for
   * @returns Promise resolving to array of matching pets
   */
  searchPetsByName(name: string): Promise<Pet[]>;

  /**
   * Search pets by species
   * @param species The species to search for
   * @returns Promise resolving to array of pets with matching species
   */
  searchPetsBySpecies(species: PetSpecies): Promise<Pet[]>;

  /**
   * Search pets by breed
   * @param breed The breed to search for
   * @returns Promise resolving to array of pets with matching breed
   */
  searchPetsByBreed(breed: string): Promise<Pet[]>;

  /**
   * Get available pets in a store
   * @param storeId The store ID
   * @returns Promise resolving to array of available pets
   */
  getAvailablePetsInStore(storeId: string): Promise<Pet[]>;

  /**
   * Get pets by status
   * @param status The pet status to filter by
   * @returns Promise resolving to array of pets with matching status
   */
  getPetsByStatus(status: PetStatus): Promise<Pet[]>;

  /**
   * Search pets with filters
   * @param filters Search criteria
   * @returns Promise resolving to array of pets matching filters
   */
  searchPetsWithFilters(filters: {
    storeId?: string;
    status?: PetStatus;
    species?: PetSpecies;
    breed?: string;
    minPrice?: number;
    maxPrice?: number;
    minAge?: number;
    maxAge?: number;
    size?: 'small' | 'medium' | 'large';
  }): Promise<Pet[]>;

  /**
   * Reserve a pet (mark as pending)
   * @param petId The pet ID to reserve
   * @returns Promise resolving to the updated pet
   */
  reservePet(petId: string): Promise<Pet>;

  /**
   * Release a pet reservation (mark as available)
   * @param petId The pet ID to release
   * @returns Promise resolving to the updated pet
   */
  releasePetReservation(petId: string): Promise<Pet>;

  /**
   * Sell a pet (mark as sold)
   * @param petId The pet ID to sell
   * @returns Promise resolving to the updated pet
   */
  sellPet(petId: string): Promise<Pet>;

  /**
   * Transfer pet to another store
   * @param petId The pet ID to transfer
   * @param newStoreId The destination store ID
   * @returns Promise resolving to the updated pet
   */
  transferPetToStore(petId: string, newStoreId: string): Promise<Pet>;

  /**
   * Get pet statistics for a store
   * @param storeId The store ID to get statistics for
   * @returns Promise resolving to pet statistics
   */
  getStorePetStats(storeId: string): Promise<{
    totalPets: number;
    availablePets: number;
    pendingPets: number;
    soldPets: number;
    petsBySpecies: Record<string, number>;
    averagePrice: number;
    averageAge: number;
  }>;

  /**
   * Validate pet business rules
   * @param pet The pet to validate
   * @returns Array of validation errors (empty if valid)
   */
  validatePet(pet: Pet): string[];

  /**
   * Check if pet can be reserved
   * @param petId The pet ID to check
   * @returns Promise resolving to true if can be reserved
   */
  canReservePet(petId: string): Promise<boolean>;

  /**
   * Check if pet can be sold
   * @param petId The pet ID to check
   * @returns Promise resolving to true if can be sold
   */
  canSellPet(petId: string): Promise<boolean>;
}