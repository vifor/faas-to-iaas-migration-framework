/**
 * Store Domain Service Interface
 * 
 * Defines the contract for store business logic operations.
 * Handles composite key operations and franchise relationships.
 */

import { Store, StoreStatus } from '../entities/store.entity';

export interface IStoreService {
  /**
   * Create a new store with business rules validation
   * @param storeData Store creation data
   * @returns Promise resolving to the created store
   */
  createStore(storeData: {
    name: string;
    value: string;
    address?: string;
    franchiseId?: string;
    phone?: string;
    email?: string;
    openingHours?: string;
  }): Promise<Store>;

  /**
   * Get a store by composite key (id + value)
   * @param id The store ID (partition key)
   * @param value The store value (sort key)
   * @returns Promise resolving to the store or null if not found
   */
  getStoreByCompositeKey(id: string, value: string): Promise<Store | null>;

  /**
   * Get stores by ID (query operation)
   * @param id The store ID to query for
   * @returns Promise resolving to array of stores with matching ID
   */
  getStoresByIdQuery(id: string): Promise<Store[]>;

  /**
   * Get all stores
   * @returns Promise resolving to array of all stores
   */
  getAllStores(): Promise<Store[]>;

  /**
   * Update store information
   * @param id The store ID (partition key)
   * @param value The store value (sort key)
   * @param updateData Data to update
   * @returns Promise resolving to the updated store
   */
  updateStore(
    id: string,
    value: string,
    updateData: {
      name?: string;
      address?: string;
      phone?: string;
      email?: string;
      openingHours?: string;
      status?: StoreStatus;
    },
  ): Promise<Store>;

  /**
   * Delete a store
   * @param id The store ID (partition key)
   * @param value The store value (sort key)
   * @returns Promise resolving to true if deleted successfully
   */
  deleteStore(id: string, value: string): Promise<boolean>;

  /**
   * Get stores belonging to a franchise
   * @param franchiseId The franchise ID
   * @returns Promise resolving to array of stores in the franchise
   */
  getStoresByFranchise(franchiseId: string): Promise<Store[]>;

  /**
   * Assign store to a franchise
   * @param storeId The store ID
   * @param storeValue The store value
   * @param franchiseId The franchise ID to assign to
   * @returns Promise resolving to the updated store
   */
  assignStoreToFranchise(
    storeId: string,
    storeValue: string,
    franchiseId: string,
  ): Promise<Store>;

  /**
   * Remove store from franchise
   * @param storeId The store ID
   * @param storeValue The store value
   * @returns Promise resolving to the updated store
   */
  removeStoreFromFranchise(storeId: string, storeValue: string): Promise<Store>;

  /**
   * Update store status
   * @param storeId The store ID
   * @param storeValue The store value
   * @param status The new status
   * @returns Promise resolving to the updated store
   */
  updateStoreStatus(
    storeId: string,
    storeValue: string,
    status: StoreStatus,
  ): Promise<Store>;

  /**
   * Search stores by name
   * @param name The name or partial name to search for
   * @returns Promise resolving to array of matching stores
   */
  searchStoresByName(name: string): Promise<Store[]>;

  /**
   * Search stores by location
   * @param location The location to search for
   * @returns Promise resolving to array of matching stores
   */
  searchStoresByLocation(location: string): Promise<Store[]>;

  /**
   * Get active stores only
   * @returns Promise resolving to array of active stores
   */
  getActiveStores(): Promise<Store[]>;

  /**
   * Get store statistics
   * @param storeId The store ID
   * @param storeValue The store value
   * @returns Promise resolving to store statistics
   */
  getStoreStats(storeId: string, storeValue: string): Promise<{
    totalPets: number;
    availablePets: number;
    totalOrders: number;
    pendingOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
  }>;

  /**
   * Get store inventory summary
   * @param storeId The store ID
   * @param storeValue The store value
   * @returns Promise resolving to inventory summary
   */
  getStoreInventory(storeId: string, storeValue: string): Promise<{
    totalPets: number;
    petsBySpecies: Record<string, number>;
    petsByStatus: Record<string, number>;
    averagePetPrice: number;
  }>;

  /**
   * Validate store business rules
   * @param store The store to validate
   * @returns Array of validation errors (empty if valid)
   */
  validateStore(store: Store): string[];

  /**
   * Check if store composite key is unique
   * @param id The store ID
   * @param value The store value
   * @returns Promise resolving to true if unique, false if exists
   */
  isCompositeKeyUnique(id: string, value: string): Promise<boolean>;
}