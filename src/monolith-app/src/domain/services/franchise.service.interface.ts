/**
 * Franchise Domain Service Interface
 * 
 * Defines the contract for franchise business logic operations.
 * Part of the hexagonal architecture - this interface defines
 * business operations that coordinate between entities and repositories.
 */

import { Franchise } from '../entities/franchise.entity';

export interface IFranchiseService {
  /**
   * Create a new franchise with business rules validation
   * @param franchiseData Franchise creation data
   * @returns Promise resolving to the created franchise
   */
  createFranchise(franchiseData: {
    name: string;
    location?: string;
    stores?: string[];
  }): Promise<Franchise>;

  /**
   * Get a franchise by ID
   * @param id The franchise ID to retrieve
   * @returns Promise resolving to the franchise or null if not found
   */
  getFranchiseById(id: string): Promise<Franchise | null>;

  /**
   * Get all franchises
   * @returns Promise resolving to array of all franchises
   */
  getAllFranchises(): Promise<Franchise[]>;

  /**
   * Update franchise information
   * @param id The franchise ID to update
   * @param updateData Data to update
   * @returns Promise resolving to the updated franchise
   */
  updateFranchise(
    id: string,
    updateData: {
      name?: string;
      location?: string;
      stores?: string[];
    },
  ): Promise<Franchise>;

  /**
   * Delete a franchise
   * @param id The franchise ID to delete
   * @returns Promise resolving to true if deleted successfully
   */
  deleteFranchise(id: string): Promise<boolean>;

  /**
   * Add a store to a franchise
   * @param franchiseId The franchise ID
   * @param storeId The store ID to add
   * @returns Promise resolving to the updated franchise
   */
  addStoreToFranchise(franchiseId: string, storeId: string): Promise<Franchise>;

  /**
   * Remove a store from a franchise
   * @param franchiseId The franchise ID
   * @param storeId The store ID to remove
   * @returns Promise resolving to the updated franchise
   */
  removeStoreFromFranchise(franchiseId: string, storeId: string): Promise<Franchise>;

  /**
   * Search franchises by name
   * @param name The name or partial name to search for
   * @returns Promise resolving to array of matching franchises
   */
  searchFranchisesByName(name: string): Promise<Franchise[]>;

  /**
   * Get franchise statistics
   * @param franchiseId The franchise ID to get statistics for
   * @returns Promise resolving to franchise statistics
   */
  getFranchiseStats(franchiseId: string): Promise<{
    totalStores: number;
    activeStores: number;
    totalPets: number;
    totalOrders: number;
    totalRevenue: number;
  }>;

  /**
   * Validate franchise business rules
   * @param franchise The franchise to validate
   * @returns Array of validation errors (empty if valid)
   */
  validateFranchise(franchise: Franchise): string[];
}