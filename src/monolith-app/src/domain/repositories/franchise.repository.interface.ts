/**
 * Franchise Repository Port Interface
 * 
 * Defines the contract for franchise data persistence operations.
 * Part of the hexagonal architecture - this is a "port" that defines
 * what operations are needed without specifying implementation details.
 * 
 * The actual implementation (adapter) will be in the infrastructure layer
 * and will implement this interface using DynamoDB or other persistence mechanisms.
 */

import { Franchise } from '../entities/franchise.entity';

export interface IFranchiseRepository {
  /**
   * Create a new franchise
   * @param franchise The franchise entity to create
   * @returns Promise resolving to the created franchise
   */
  create(franchise: Franchise): Promise<Franchise>;

  /**
   * Find a franchise by its ID
   * @param id The franchise ID to search for
   * @returns Promise resolving to the franchise or null if not found
   */
  findById(id: string): Promise<Franchise | null>;

  /**
   * Find all franchises
   * @returns Promise resolving to array of all franchises
   */
  findAll(): Promise<Franchise[]>;

  /**
   * Find franchises by ID using query operation
   * @param id The franchise ID to query for
   * @returns Promise resolving to array of matching franchises
   */
  findByIdQuery(id: string): Promise<Franchise[]>;

  /**
   * Update an existing franchise
   * @param franchise The franchise entity with updated data
   * @returns Promise resolving to the updated franchise
   */
  update(franchise: Franchise): Promise<Franchise>;

  /**
   * Delete a franchise by ID
   * @param id The franchise ID to delete
   * @returns Promise resolving to true if deleted, false if not found
   */
  delete(id: string): Promise<boolean>;

  /**
   * Check if a franchise exists
   * @param id The franchise ID to check
   * @returns Promise resolving to true if exists, false otherwise
   */
  exists(id: string): Promise<boolean>;

  /**
   * Find franchises by name (partial match)
   * @param name The name or partial name to search for
   * @returns Promise resolving to array of matching franchises
   */
  findByName(name: string): Promise<Franchise[]>;

  /**
   * Find franchises by location
   * @param location The location to search for
   * @returns Promise resolving to array of matching franchises
   */
  findByLocation(location: string): Promise<Franchise[]>;

  /**
   * Get the total count of franchises
   * @returns Promise resolving to the total number of franchises
   */
  count(): Promise<number>;
}