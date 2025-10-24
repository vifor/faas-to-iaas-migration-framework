/**
 * Store Repository Port Interface
 * 
 * Defines the contract for store data persistence operations.
 * Handles composite key operations (id + value) for DynamoDB integration.
 * 
 * Part of the hexagonal architecture - this is a "port" that defines
 * what operations are needed without specifying implementation details.
 */

import { Store } from '../entities/store.entity';

export interface IStoreRepository {
  /**
   * Create a new store
   * @param store The store entity to create
   * @returns Promise resolving to the created store
   */
  create(store: Store): Promise<Store>;

  /**
   * Find a store by its composite key (id + value)
   * @param id The store ID (partition key)
   * @param value The store value (sort key)
   * @returns Promise resolving to the store or null if not found
   */
  findByCompositeKey(id: string, value: string): Promise<Store | null>;

  /**
   * Find all stores with a specific ID (query operation)
   * @param id The store ID to query for
   * @returns Promise resolving to array of stores with matching ID
   */
  findByIdQuery(id: string): Promise<Store[]>;

  /**
   * Find all stores
   * @returns Promise resolving to array of all stores
   */
  findAll(): Promise<Store[]>;

  /**
   * Update an existing store
   * @param store The store entity with updated data
   * @returns Promise resolving to the updated store
   */
  update(store: Store): Promise<Store>;

  /**
   * Delete a store by its composite key
   * @param id The store ID (partition key)
   * @param value The store value (sort key)
   * @returns Promise resolving to true if deleted, false if not found
   */
  delete(id: string, value: string): Promise<boolean>;

  /**
   * Check if a store exists by composite key
   * @param id The store ID (partition key)
   * @param value The store value (sort key)
   * @returns Promise resolving to true if exists, false otherwise
   */
  exists(id: string, value: string): Promise<boolean>;

  /**
   * Find stores by franchise ID
   * @param franchiseId The franchise ID to search for
   * @returns Promise resolving to array of stores belonging to the franchise
   */
  findByFranchiseId(franchiseId: string): Promise<Store[]>;

  /**
   * Find stores by name (partial match)
   * @param name The name or partial name to search for
   * @returns Promise resolving to array of matching stores
   */
  findByName(name: string): Promise<Store[]>;

  /**
   * Find stores by status
   * @param status The store status to search for
   * @returns Promise resolving to array of stores with matching status
   */
  findByStatus(status: string): Promise<Store[]>;

  /**
   * Find stores by location/address
   * @param location The location to search for
   * @returns Promise resolving to array of matching stores
   */
  findByLocation(location: string): Promise<Store[]>;

  /**
   * Get the total count of stores
   * @returns Promise resolving to the total number of stores
   */
  count(): Promise<number>;

  /**
   * Get stores with pagination
   * @param limit Maximum number of stores to return
   * @param lastKey Optional last evaluated key for pagination
   * @returns Promise resolving to paginated store results
   */
  findWithPagination(
    limit: number,
    lastKey?: Record<string, any>,
  ): Promise<{
    stores: Store[];
    lastEvaluatedKey?: Record<string, any>;
    hasMore: boolean;
  }>;
}