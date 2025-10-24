/**
 * User Repository Interface
 * 
 * Defines the contract for user data persistence operations.
 * Follows repository pattern to decouple domain logic from
 * infrastructure concerns.
 */

import { User, UserRole, UserStatus } from '../entities/user.entity';

export interface IUserRepository {
  /**
   * Create a new user
   */
  create(user: User): Promise<User>;

  /**
   * Find user by unique identifier
   */
  findById(id: string): Promise<User | null>;

  /**
   * Find user by email address
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Update existing user
   */
  update(user: User): Promise<User>;

  /**
   * Delete user by ID
   */
  delete(id: string): Promise<void>;

  /**
   * Find users by role
   */
  findByRole(role: UserRole): Promise<User[]>;

  /**
   * Find users by status
   */
  findByStatus(status: UserStatus): Promise<User[]>;

  /**
   * Find users associated with a store
   */
  findByStoreId(storeId: string): Promise<User[]>;

  /**
   * Find users associated with a franchise
   */
  findByFranchiseId(franchiseId: string): Promise<User[]>;

  /**
   * Search users by name or email
   */
  search(query: string): Promise<User[]>;

  /**
   * Get total count of users
   */
  count(): Promise<number>;

  /**
   * Get users with pagination
   */
  findWithPagination(offset: number, limit: number): Promise<{
    users: User[];
    total: number;
    hasMore: boolean;
  }>;

  /**
   * Check if email is already in use
   */
  emailExists(email: string): Promise<boolean>;

  /**
   * Find user by refresh token
   */
  findByRefreshToken(refreshToken: string): Promise<User | null>;

  /**
   * Get users who haven't logged in for a specified number of days
   */
  findInactiveUsers(daysSinceLastLogin: number): Promise<User[]>;

  /**
   * Get users pending email verification
   */
  findPendingVerification(): Promise<User[]>;
}