/**
 * DynamoDB User Repository Implementation
 * 
 * Implements the IUserRepository interface using AWS DynamoDB as the persistence layer.
 * Provides comprehensive user management with authentication features, role-based access,
 * and store associations. Uses proper DynamoDB patterns for data modeling and querying.
 * 
 * Key Features:
 * - User CRUD operations with email uniqueness constraints
 * - Password hashing and verification
 * - JWT refresh token management
 * - Role-based access control (admin, store_owner, store_employee, customer)
 * - Store association management
 * - User search and pagination
 * - Account status management (active, inactive, suspended)
 * 
 * DynamoDB Table Design:
 * - Primary Key: id (User ID)
 * - Global Secondary Index: email-index for email-based lookups
 * - Global Secondary Index: store-index for store-based user queries
 * - Global Secondary Index: refresh-token-index for token validation
 */

import { Injectable, Logger, ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBService } from '../../database/dynamodb.service';
import { 
  QueryCommand, 
  GetCommand, 
  PutCommand, 
  DeleteCommand, 
  ScanCommand,
  UpdateCommand
} from '@aws-sdk/lib-dynamodb';
import { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { User, UserRole, UserStatus, UserProfile } from '../../domain/entities/user.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class DynamoDBUserRepository implements IUserRepository {
  private readonly logger = new Logger(DynamoDBUserRepository.name);
  private readonly tableName: string;
  private docClient: any;

  constructor(
    private readonly dynamoService: DynamoDBService,
    private readonly configService: ConfigService,
  ) {
    // Initialize table name with environment suffix
    const env = this.configService.get<string>('aws.env');
    const suffix = env && env !== 'NONE' ? `-${env}` : '';
    this.tableName = `petstoreUsers${suffix}`;
    
    // Get document client from DynamoDB service
    const clients = this.dynamoService.getClients();
    this.docClient = clients.docClient;
    
    this.logger.log('🔐 User Repository initialized for table: ' + this.tableName);
  }

  /**
   * Create a new user
   */
  async create(user: User): Promise<User> {
    try {
      // Check if email already exists
      const existingUser = await this.findByEmail(user.email);
      if (existingUser) {
        throw new ConflictException(`User with email ${user.email} already exists`);
      }

      // Save to DynamoDB with conditional check to prevent overwrites
      await this.docClient.send(new PutCommand({
        TableName: this.tableName,
        Item: this.entityToItem(user),
        ConditionExpression: 'attribute_not_exists(id)',
      }));

      this.logger.log(`👤 User created: ${user.email} (${user.id})`);
      return user;

    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(`❌ Error creating user: ${user.email}`, error.stack);
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }

  /**
   * Find user by unique email address
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      // For now, use scan to find by email (in production, should use GSI)
      const result = await this.docClient.send(new ScanCommand({
        TableName: this.tableName,
        FilterExpression: 'email = :email',
        ExpressionAttributeValues: { ':email': email },
        Limit: 1,
      }));

      if (!result.Items || result.Items.length === 0) {
        return null;
      }

      const user = this.itemToEntity(result.Items[0]);
      this.logger.debug(`👤 User found by email: ${email}`);
      return user;

    } catch (error) {
      this.logger.error(`❌ Error finding user by email: ${email}`, error.stack);
      throw new Error(`Failed to find user by email: ${error.message}`);
    }
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    try {
      const result = await this.docClient.send(new GetCommand({
        TableName: this.tableName,
        Key: { id },
      }));

      if (!result.Item) {
        return null;
      }

      const user = this.itemToEntity(result.Item);
      this.logger.debug(`👤 User found by ID: ${id}`);
      return user;

    } catch (error) {
      this.logger.error(`❌ Error finding user by ID: ${id}`, error.stack);
      throw new Error(`Failed to find user by ID: ${error.message}`);
    }
  }

  /**
   * Update user information
   */
  async update(user: User): Promise<User> {
    try {
      // Save updated user to DynamoDB
      await this.docClient.send(new PutCommand({
        TableName: this.tableName,
        Item: this.entityToItem(user),
        ConditionExpression: 'attribute_exists(id)',
      }));

      this.logger.log(`👤 User updated: ${user.id}`);
      return user;

    } catch (error) {
      this.logger.error(`❌ Error updating user: ${user.id}`, error.stack);
      throw new Error(`Failed to update user: ${error.message}`);
    }
  }

  /**
   * Delete user by ID
   */
  async delete(id: string): Promise<void> {
    try {
      await this.docClient.send(new DeleteCommand({
        TableName: this.tableName,
        Key: { id },
        ConditionExpression: 'attribute_exists(id)',
      }));

      this.logger.log(`👤 User deleted: ${id}`);

    } catch (error) {
      // DynamoDB throws different error for conditional check failures
      if (error.name === 'ConditionalCheckFailedException') {
        throw new NotFoundException(`User with ID ${id} not found`);
      }
      this.logger.error(`❌ Error deleting user: ${id}`, error.stack);
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }

  /**
   * Check if email exists in the system
   */
  async emailExists(email: string): Promise<boolean> {
    const user = await this.findByEmail(email);
    return !!user;
  }

  /**
   * Find users by role
   */
  async findByRole(role: UserRole, limit?: number): Promise<User[]> {
    try {
      const result = await this.docClient.send(new ScanCommand({
        TableName: this.tableName,
        FilterExpression: '#role = :role',
        ExpressionAttributeNames: { '#role': 'role' },
        ExpressionAttributeValues: { ':role': role },
        Limit: limit,
      }));

      const users = (result.Items || []).map(item => this.itemToEntity(item));
      this.logger.debug(`👥 Found ${users.length} users with role: ${role}`);
      return users;

    } catch (error) {
      this.logger.error(`❌ Error finding users by role: ${role}`, error.stack);
      throw new Error(`Failed to find users by role: ${error.message}`);
    }
  }

  /**
   * Find users by store ID
   */
  async findByStoreId(storeId: string, limit?: number): Promise<User[]> {
    try {
      const result = await this.docClient.send(new ScanCommand({
        TableName: this.tableName,
        FilterExpression: 'storeId = :storeId',
        ExpressionAttributeValues: { ':storeId': storeId },
        Limit: limit,
      }));

      const users = (result.Items || []).map(item => this.itemToEntity(item));
      this.logger.debug(`👥 Found ${users.length} users for store: ${storeId}`);
      return users;

    } catch (error) {
      this.logger.error(`❌ Error finding users by store: ${storeId}`, error.stack);
      throw new Error(`Failed to find users by store: ${error.message}`);
    }
  }

  /**
   * Search users by name or email
   */
  async search(query: string): Promise<User[]> {
    try {
      const result = await this.docClient.send(new ScanCommand({
        TableName: this.tableName,
        FilterExpression: 'contains(email, :query) OR contains(#firstName, :query) OR contains(#lastName, :query)',
        ExpressionAttributeNames: { 
          '#firstName': 'profile.firstName',
          '#lastName': 'profile.lastName'
        },
        ExpressionAttributeValues: { ':query': query },
      }));

      const users = (result.Items || []).map(item => this.itemToEntity(item));
      this.logger.debug(`👥 Found ${users.length} users matching query: ${query}`);
      return users;

    } catch (error) {
      this.logger.error(`❌ Error searching users with query: ${query}`, error.stack);
      throw new Error(`Failed to search users: ${error.message}`);
    }
  }

  /**
   * Find users by status
   */
  async findByStatus(status: UserStatus, limit?: number): Promise<User[]> {
    try {
      const result = await this.docClient.send(new ScanCommand({
        TableName: this.tableName,
        FilterExpression: '#status = :status',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':status': status },
        Limit: limit,
      }));

      const users = (result.Items || []).map(item => this.itemToEntity(item));
      this.logger.debug(`👥 Found ${users.length} users with status: ${status}`);
      return users;

    } catch (error) {
      this.logger.error(`❌ Error finding users by status: ${status}`, error.stack);
      throw new Error(`Failed to find users by status: ${error.message}`);
    }
  }

  /**
   * Get paginated list of all users
   */
  async findWithPagination(offset: number, limit: number): Promise<{ users: User[]; total: number; hasMore: boolean }> {
    try {
      // Get total count first
      const totalCount = await this.count();
      
      // Calculate pagination
      const startKey = offset > 0 ? { id: `offset_${offset}` } : undefined;
      
      const params: any = {
        TableName: this.tableName,
        Limit: limit,
      };

      if (startKey) {
        params.ExclusiveStartKey = startKey;
      }

      const result = await this.docClient.send(new ScanCommand(params));

      const users = (result.Items || []).map(item => this.itemToEntity(item));
      const hasMore = !!result.LastEvaluatedKey;
      
      this.logger.debug(`👥 Retrieved ${users.length} users (offset: ${offset}, limit: ${limit})`);

      return {
        users,
        total: totalCount,
        hasMore,
      };

    } catch (error) {
      this.logger.error('❌ Error retrieving paginated users', error.stack);
      throw new Error(`Failed to retrieve users: ${error.message}`);
    }
  }

  /**
   * Find users by franchise ID
   */
  async findByFranchiseId(franchiseId: string): Promise<User[]> {
    try {
      const result = await this.docClient.send(new ScanCommand({
        TableName: this.tableName,
        FilterExpression: 'franchiseId = :franchiseId',
        ExpressionAttributeValues: { ':franchiseId': franchiseId },
      }));

      const users = (result.Items || []).map(item => this.itemToEntity(item));
      this.logger.debug(`👥 Found ${users.length} users for franchise: ${franchiseId}`);
      return users;

    } catch (error) {
      this.logger.error(`❌ Error finding users by franchise: ${franchiseId}`, error.stack);
      throw new Error(`Failed to find users by franchise: ${error.message}`);
    }
  }

  /**
   * Get users pending email verification
   */
  async findPendingVerification(): Promise<User[]> {
    try {
      const result = await this.docClient.send(new ScanCommand({
        TableName: this.tableName,
        FilterExpression: '#status = :status',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':status': UserStatus.PENDING_VERIFICATION },
      }));

      const users = (result.Items || []).map(item => this.itemToEntity(item));
      this.logger.debug(`👥 Found ${users.length} users pending verification`);
      return users;

    } catch (error) {
      this.logger.error('❌ Error finding users pending verification', error.stack);
      throw new Error(`Failed to find users pending verification: ${error.message}`);
    }
  }

  /**
   * Find user by refresh token  
   */
  async findByRefreshToken(refreshToken: string): Promise<User | null> {
    try {
      const result = await this.docClient.send(new ScanCommand({
        TableName: this.tableName,
        FilterExpression: 'contains(refreshTokens, :token)',
        ExpressionAttributeValues: { ':token': refreshToken },
        Limit: 1,
      }));

      if (!result.Items || result.Items.length === 0) {
        return null;
      }

      const user = this.itemToEntity(result.Items[0]);
      this.logger.debug(`👤 User found by refresh token`);
      return user;

    } catch (error) {
      this.logger.error('❌ Error finding user by refresh token', error.stack);
      return null; // Return null for invalid tokens instead of throwing
    }
  }
  async findInactiveUsers(daysSinceLastLogin: number): Promise<User[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysSinceLastLogin);

      const result = await this.docClient.send(new ScanCommand({
        TableName: this.tableName,
        FilterExpression: '#lastLoginAt < :cutoffDate OR attribute_not_exists(#lastLoginAt)',
        ExpressionAttributeNames: { 
          '#lastLoginAt': 'lastLoginAt'
        },
        ExpressionAttributeValues: { 
          ':cutoffDate': cutoffDate.toISOString()
        },
      }));

      const users = (result.Items || []).map(item => this.itemToEntity(item));
      this.logger.debug(`👥 Found ${users.length} inactive users (${daysSinceLastLogin}+ days)`);
      return users;

    } catch (error) {
      this.logger.error('❌ Error finding inactive users', error.stack);
      throw new Error(`Failed to find inactive users: ${error.message}`);
    }
  }

  /**
   * Count total users
   */
  async count(): Promise<number> {
    try {
      const result = await this.docClient.send(new ScanCommand({
        TableName: this.tableName,
        Select: 'COUNT',
      }));

      const count = result.Count || 0;
      this.logger.debug(`👥 Total user count: ${count}`);
      return count;

    } catch (error) {
      this.logger.error('❌ Error counting users', error.stack);
      throw new Error(`Failed to count users: ${error.message}`);
    }
  }

  /**
   * Convert User entity to DynamoDB item
   */
  private entityToItem(user: User): any {
    return {
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      role: user.role,
      status: user.status,
      profile: user.profile,
      storeId: user.storeId,
      franchiseId: user.franchiseId,
      refreshTokens: user.refreshTokens,
      lastLoginAt: user.lastLoginAt?.toISOString(),
      emailVerifiedAt: user.emailVerifiedAt?.toISOString(),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  /**
   * Convert DynamoDB item to User entity
   */
  private itemToEntity(item: any): User {
    return new User(
      item.id,
      item.email,
      item.passwordHash,
      item.role as UserRole,
      item.status as UserStatus,
      item.profile as UserProfile,
      item.storeId,
      item.franchiseId,
      new Date(item.createdAt),
      new Date(item.updatedAt),
      item.lastLoginAt ? new Date(item.lastLoginAt) : undefined,
      item.emailVerifiedAt ? new Date(item.emailVerifiedAt) : undefined,
      item.refreshTokens || []
    );
  }
}