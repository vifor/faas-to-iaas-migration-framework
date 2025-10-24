/**
 * DynamoDB Franchise Repository Implementation
 * 
 * Infrastructure adapter that implements IFranchiseRepository interface.
 * Handles all CRUD operations for the petstoreFranchise DynamoDB table.
 * 
 * Table Structure:
 * - Table Name: petstoreFranchise-{ENV}
 * - Partition Key: id (String)
 * - No Sort Key (simple primary key)
 * 
 * Operations Supported:
 * - Query by partition key (id)
 * - GetItem by id  
 * - PutItem (create/update)
 * - DeleteItem by id
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IFranchiseRepository } from '../../domain/repositories/franchise.repository.interface';
import { Franchise } from '../../domain/entities/franchise.entity';
import { DynamoDBService } from '../../database/dynamodb.service';

@Injectable()
export class DynamoDBFranchiseRepository implements IFranchiseRepository {
  private readonly logger = new Logger(DynamoDBFranchiseRepository.name);
  private readonly tableName: string;

  constructor(
    private readonly dynamoDBService: DynamoDBService,
    private readonly configService: ConfigService,
  ) {
    const baseTableName = this.configService.get<string>('aws.franchiseTableName');
    const env = this.configService.get<string>('aws.env');
    this.tableName = env && env !== 'NONE' ? `${baseTableName}-${env}` : baseTableName;
    
    this.logger.log(`🏢 Franchise Repository initialized for table: ${this.tableName}`);
  }

  /**
   * Create a new franchise
   */
  async create(franchise: Franchise): Promise<Franchise> {
    try {
      this.logger.debug(`Creating franchise: ${franchise.id}`);
      
      const item = this.toItemFormat(franchise);
      
      await this.dynamoDBService.putFranchise(item);
      
      this.logger.log(`✅ Created franchise: ${franchise.id}`);
      return franchise;
    } catch (error) {
      this.logger.error(`❌ Failed to create franchise ${franchise.id}:`, error);
      throw new Error(`Failed to create franchise: ${error.message}`);
    }
  }

  /**
   * Find a franchise by its ID using GetItem operation
   */
  async findById(id: string): Promise<Franchise | null> {
    try {
      this.logger.debug(`Finding franchise by ID: ${id}`);
      
      const item = await this.dynamoDBService.getFranchise(id);
      
      if (!item) {
        this.logger.debug(`Franchise not found: ${id}`);
        return null;
      }

      const franchise = this.fromItemFormat(item);
      this.logger.debug(`✅ Found franchise: ${id}`);
      return franchise;
    } catch (error) {
      this.logger.error(`❌ Failed to find franchise ${id}:`, error);
      throw new Error(`Failed to find franchise: ${error.message}`);
    }
  }

  /**
   * Find all franchises using Query operation
   */
  async findAll(): Promise<Franchise[]> {
    try {
      this.logger.debug('Finding all franchises');
      
      const result = await this.dynamoDBService.queryFranchises();
      const items = result.Items || [];
      
      const franchises = items.map(item => this.fromItemFormat(item));
      
      this.logger.log(`✅ Found ${franchises.length} franchises`);
      return franchises;
    } catch (error) {
      this.logger.error('❌ Failed to find all franchises:', error);
      throw new Error(`Failed to find franchises: ${error.message}`);
    }
  }

  /**
   * Find franchises by ID using Query operation (DynamoDB query pattern)
   */
  async findByIdQuery(id: string): Promise<Franchise[]> {
    try {
      this.logger.debug(`Querying franchises by ID: ${id}`);
      
      // For franchise table with simple primary key, this will return 0 or 1 item
      const result = await this.dynamoDBService.queryFranchises({ id });
      const items = result.Items || [];
      
      const franchises = items.map(item => this.fromItemFormat(item));
      
      this.logger.debug(`✅ Found ${franchises.length} franchises for ID query: ${id}`);
      return franchises;
    } catch (error) {
      this.logger.error(`❌ Failed to query franchises by ID ${id}:`, error);
      throw new Error(`Failed to query franchises: ${error.message}`);
    }
  }

  /**
   * Update an existing franchise
   */
  async update(franchise: Franchise): Promise<Franchise> {
    try {
      this.logger.debug(`Updating franchise: ${franchise.id}`);
      
      // Check if franchise exists
      const existingFranchise = await this.findById(franchise.id);
      if (!existingFranchise) {
        throw new Error(`Franchise with ID ${franchise.id} not found`);
      }

      // Update timestamp
      franchise.updatedAt = new Date();
      
      const item = this.toItemFormat(franchise);
      
      await this.dynamoDBService.putFranchise(item);
      
      this.logger.log(`✅ Updated franchise: ${franchise.id}`);
      return franchise;
    } catch (error) {
      this.logger.error(`❌ Failed to update franchise ${franchise.id}:`, error);
      throw new Error(`Failed to update franchise: ${error.message}`);
    }
  }

  /**
   * Delete a franchise by ID
   */
  async delete(id: string): Promise<boolean> {
    try {
      this.logger.debug(`Deleting franchise: ${id}`);
      
      // Check if franchise exists
      const existingFranchise = await this.findById(id);
      if (!existingFranchise) {
        this.logger.debug(`Franchise not found for deletion: ${id}`);
        return false;
      }

      await this.dynamoDBService.deleteFranchise(id);
      
      this.logger.log(`✅ Deleted franchise: ${id}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Failed to delete franchise ${id}:`, error);
      throw new Error(`Failed to delete franchise: ${error.message}`);
    }
  }

  /**
   * Check if a franchise exists
   */
  async exists(id: string): Promise<boolean> {
    try {
      const franchise = await this.findById(id);
      return franchise !== null;
    } catch (error) {
      this.logger.error(`❌ Failed to check franchise existence ${id}:`, error);
      return false;
    }
  }

  /**
   * Find franchises by name (partial match)
   * Note: DynamoDB doesn't support efficient text search, so we scan all and filter
   */
  async findByName(name: string): Promise<Franchise[]> {
    try {
      this.logger.debug(`Finding franchises by name: ${name}`);
      
      const allFranchises = await this.findAll();
      const matchingFranchises = allFranchises.filter(franchise =>
        franchise.name.toLowerCase().includes(name.toLowerCase())
      );
      
      this.logger.debug(`✅ Found ${matchingFranchises.length} franchises matching name: ${name}`);
      return matchingFranchises;
    } catch (error) {
      this.logger.error(`❌ Failed to find franchises by name ${name}:`, error);
      throw new Error(`Failed to find franchises by name: ${error.message}`);
    }
  }

  /**
   * Find franchises by location
   * Note: DynamoDB doesn't support efficient text search, so we scan all and filter
   */
  async findByLocation(location: string): Promise<Franchise[]> {
    try {
      this.logger.debug(`Finding franchises by location: ${location}`);
      
      const allFranchises = await this.findAll();
      const matchingFranchises = allFranchises.filter(franchise =>
        franchise.location?.toLowerCase().includes(location.toLowerCase())
      );
      
      this.logger.debug(`✅ Found ${matchingFranchises.length} franchises matching location: ${location}`);
      return matchingFranchises;
    } catch (error) {
      this.logger.error(`❌ Failed to find franchises by location ${location}:`, error);
      throw new Error(`Failed to find franchises by location: ${error.message}`);
    }
  }

  /**
   * Get the total count of franchises
   */
  async count(): Promise<number> {
    try {
      this.logger.debug('Counting all franchises');
      
      const franchises = await this.findAll();
      const count = franchises.length;
      
      this.logger.debug(`✅ Total franchise count: ${count}`);
      return count;
    } catch (error) {
      this.logger.error('❌ Failed to count franchises:', error);
      throw new Error(`Failed to count franchises: ${error.message}`);
    }
  }

  /**
   * Convert Franchise entity to DynamoDB item format
   */
  private toItemFormat(franchise: Franchise): Record<string, any> {
    return {
      id: franchise.id,
      name: franchise.name,
      location: franchise.location,
      stores: franchise.stores.map(storeId => ({ id: storeId })), // Convert to array of objects with id field
      createdAt: franchise.createdAt.toISOString(),
      updatedAt: franchise.updatedAt.toISOString(),
    };
  }

  /**
   * Convert DynamoDB item to Franchise entity format
   */
  private fromItemFormat(item: Record<string, any>): Franchise {
    // Extract store IDs from array of objects
    const stores = Array.isArray(item.stores) 
      ? item.stores.map(store => typeof store === 'object' && store.id ? store.id : store)
      : [];

    return new Franchise(
      item.id,
      item.name,
      item.location,
      stores,
      item.createdAt ? new Date(item.createdAt) : undefined,
      item.updatedAt ? new Date(item.updatedAt) : undefined,
    );
  }
}