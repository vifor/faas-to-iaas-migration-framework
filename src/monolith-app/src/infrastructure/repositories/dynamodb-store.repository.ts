/**
 * DynamoDB Store Repository Implementation
 * 
 * Infrastructure adapter that implements IStoreRepository interface.
 * Handles all CRUD operations for the petstoreTenants DynamoDB table with composite key support.
 * 
 * Table Structure:
 * - Table Name: petstoreTenants-{ENV}
 * - Partition Key: id (String) 
 * - Sort Key: value (String)
 * - Composite Key: (id, value)
 * 
 * Operations Supported:
 * - Query by partition key (id) - returns multiple stores
 * - GetItem by composite key (id, value) - returns single store
 * - PutItem (create/update)
 * - DeleteItem by composite key (id, value)
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IStoreRepository } from '../../domain/repositories/store.repository.interface';
import { Store } from '../../domain/entities/store.entity';
import { DynamoDBService } from '../../database/dynamodb.service';

@Injectable()
export class DynamoDBStoreRepository implements IStoreRepository {
  private readonly logger = new Logger(DynamoDBStoreRepository.name);
  private readonly tableName: string;

  constructor(
    private readonly dynamoDBService: DynamoDBService,
    private readonly configService: ConfigService,
  ) {
    const baseTableName = this.configService.get<string>('aws.tenantsTableName');
    const env = this.configService.get<string>('aws.env');
    this.tableName = env && env !== 'NONE' ? `${baseTableName}-${env}` : baseTableName;
    
    this.logger.log(`🏪 Store Repository initialized for table: ${this.tableName}`);
  }

  /**
   * Create a new store
   */
  async create(store: Store): Promise<Store> {
    try {
      this.logger.debug(`Creating store: ${store.id}#${store.value}`);
      
      const item = this.toItemFormat(store);
      
      await this.dynamoDBService.putStore(item);
      
      this.logger.log(`✅ Created store: ${store.id}#${store.value}`);
      return store;
    } catch (error) {
      this.logger.error(`❌ Failed to create store ${store.id}#${store.value}:`, error);
      throw new Error(`Failed to create store: ${error.message}`);
    }
  }

  /**
   * Find a store by its composite key (id + value) using GetItem operation
   */
  async findByCompositeKey(id: string, value: string): Promise<Store | null> {
    try {
      this.logger.debug(`Finding store by composite key: ${id}#${value}`);
      
      const item = await this.dynamoDBService.getStore(id, value);
      
      if (!item) {
        this.logger.debug(`Store not found: ${id}#${value}`);
        return null;
      }

      const store = this.fromItemFormat(item);
      this.logger.debug(`✅ Found store: ${id}#${value}`);
      return store;
    } catch (error) {
      this.logger.error(`❌ Failed to find store ${id}#${value}:`, error);
      throw new Error(`Failed to find store: ${error.message}`);
    }
  }

  /**
   * Find all stores with a specific ID using Query operation
   */
  async findByIdQuery(id: string): Promise<Store[]> {
    try {
      this.logger.debug(`Querying stores by ID: ${id}`);
      
      const result = await this.dynamoDBService.queryStores({ id });
      const items = result.Items || [];
      
      const stores = items.map(item => this.fromItemFormat(item));
      
      this.logger.debug(`✅ Found ${stores.length} stores for ID: ${id}`);
      return stores;
    } catch (error) {
      this.logger.error(`❌ Failed to query stores by ID ${id}:`, error);
      throw new Error(`Failed to query stores: ${error.message}`);
    }
  }

  /**
   * Find all stores using Query operation (scan all)
   */
  async findAll(): Promise<Store[]> {
    try {
      this.logger.debug('Finding all stores');
      
      const result = await this.dynamoDBService.queryStores();
      const items = result.Items || [];
      
      const stores = items.map(item => this.fromItemFormat(item));
      
      this.logger.log(`✅ Found ${stores.length} stores`);
      return stores;
    } catch (error) {
      this.logger.error('❌ Failed to find all stores:', error);
      throw new Error(`Failed to find stores: ${error.message}`);
    }
  }

  /**
   * Update an existing store
   */
  async update(store: Store): Promise<Store> {
    try {
      this.logger.debug(`Updating store: ${store.id}#${store.value}`);
      
      // Check if store exists
      const existingStore = await this.findByCompositeKey(store.id, store.value);
      if (!existingStore) {
        throw new Error(`Store with composite key ${store.id}#${store.value} not found`);
      }

      // Update timestamp
      store.updatedAt = new Date();
      
      const item = this.toItemFormat(store);
      
      await this.dynamoDBService.putStore(item);
      
      this.logger.log(`✅ Updated store: ${store.id}#${store.value}`);
      return store;
    } catch (error) {
      this.logger.error(`❌ Failed to update store ${store.id}#${store.value}:`, error);
      throw new Error(`Failed to update store: ${error.message}`);
    }
  }

  /**
   * Delete a store by its composite key
   */
  async delete(id: string, value: string): Promise<boolean> {
    try {
      this.logger.debug(`Deleting store: ${id}#${value}`);
      
      // Check if store exists
      const existingStore = await this.findByCompositeKey(id, value);
      if (!existingStore) {
        this.logger.debug(`Store not found for deletion: ${id}#${value}`);
        return false;
      }

      await this.dynamoDBService.deleteStore(id, value);
      
      this.logger.log(`✅ Deleted store: ${id}#${value}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Failed to delete store ${id}#${value}:`, error);
      throw new Error(`Failed to delete store: ${error.message}`);
    }
  }

  /**
   * Check if a store exists by composite key
   */
  async exists(id: string, value: string): Promise<boolean> {
    try {
      const store = await this.findByCompositeKey(id, value);
      return store !== null;
    } catch (error) {
      this.logger.error(`❌ Failed to check store existence ${id}#${value}:`, error);
      return false;
    }
  }

  /**
   * Find stores by franchise ID
   */
  async findByFranchiseId(franchiseId: string): Promise<Store[]> {
    try {
      this.logger.debug(`Finding stores by franchise ID: ${franchiseId}`);
      
      const allStores = await this.findAll();
      const franchiseStores = allStores.filter(store => store.franchiseId === franchiseId);
      
      this.logger.debug(`✅ Found ${franchiseStores.length} stores for franchise: ${franchiseId}`);
      return franchiseStores;
    } catch (error) {
      this.logger.error(`❌ Failed to find stores by franchise ID ${franchiseId}:`, error);
      throw new Error(`Failed to find stores by franchise: ${error.message}`);
    }
  }

  /**
   * Find stores by name (partial match)
   */
  async findByName(name: string): Promise<Store[]> {
    try {
      this.logger.debug(`Finding stores by name: ${name}`);
      
      const allStores = await this.findAll();
      const matchingStores = allStores.filter(store =>
        store.name.toLowerCase().includes(name.toLowerCase())
      );
      
      this.logger.debug(`✅ Found ${matchingStores.length} stores matching name: ${name}`);
      return matchingStores;
    } catch (error) {
      this.logger.error(`❌ Failed to find stores by name ${name}:`, error);
      throw new Error(`Failed to find stores by name: ${error.message}`);
    }
  }

  /**
   * Find stores by status
   */
  async findByStatus(status: string): Promise<Store[]> {
    try {
      this.logger.debug(`Finding stores by status: ${status}`);
      
      const allStores = await this.findAll();
      const matchingStores = allStores.filter(store => store.status === status);
      
      this.logger.debug(`✅ Found ${matchingStores.length} stores with status: ${status}`);
      return matchingStores;
    } catch (error) {
      this.logger.error(`❌ Failed to find stores by status ${status}:`, error);
      throw new Error(`Failed to find stores by status: ${error.message}`);
    }
  }

  /**
   * Find stores by location/address
   */
  async findByLocation(location: string): Promise<Store[]> {
    try {
      this.logger.debug(`Finding stores by location: ${location}`);
      
      const allStores = await this.findAll();
      const matchingStores = allStores.filter(store =>
        store.address?.toLowerCase().includes(location.toLowerCase())
      );
      
      this.logger.debug(`✅ Found ${matchingStores.length} stores matching location: ${location}`);
      return matchingStores;
    } catch (error) {
      this.logger.error(`❌ Failed to find stores by location ${location}:`, error);
      throw new Error(`Failed to find stores by location: ${error.message}`);
    }
  }

  /**
   * Get the total count of stores
   */
  async count(): Promise<number> {
    try {
      this.logger.debug('Counting all stores');
      
      const stores = await this.findAll();
      const count = stores.length;
      
      this.logger.debug(`✅ Total store count: ${count}`);
      return count;
    } catch (error) {
      this.logger.error('❌ Failed to count stores:', error);
      throw new Error(`Failed to count stores: ${error.message}`);
    }
  }

  /**
   * Get stores with pagination
   */
  async findWithPagination(
    limit: number,
    lastKey?: Record<string, any>,
  ): Promise<{
    stores: Store[];
    lastEvaluatedKey?: Record<string, any>;
    hasMore: boolean;
  }> {
    try {
      this.logger.debug(`Finding stores with pagination: limit=${limit}`);
      
      const result = await this.dynamoDBService.queryStores({
        limit,
        exclusiveStartKey: lastKey,
      });
      
      const items = result.Items || [];
      const stores = items.map(item => this.fromItemFormat(item));
      
      const response = {
        stores,
        lastEvaluatedKey: result.LastEvaluatedKey,
        hasMore: !!result.LastEvaluatedKey,
      };
      
      this.logger.debug(`✅ Found ${stores.length} stores with pagination`);
      return response;
    } catch (error) {
      this.logger.error('❌ Failed to find stores with pagination:', error);
      throw new Error(`Failed to find stores with pagination: ${error.message}`);
    }
  }

  /**
   * Convert Store entity to DynamoDB item format
   */
  private toItemFormat(store: Store): Record<string, any> {
    const item: Record<string, any> = {
      id: store.id,
      value: store.value,
      name: store.name,
      status: store.status,
      createdAt: store.createdAt.toISOString(),
      updatedAt: store.updatedAt.toISOString(),
    };

    // Add optional fields only if they exist
    if (store.address) item.address = store.address;
    if (store.franchiseId) item.franchiseId = store.franchiseId;
    if (store.phone) item.phone = store.phone;
    if (store.email) item.email = store.email;
    if (store.openingHours) item.openingHours = store.openingHours;

    // Add franchise reference in the format expected by authorization system
    if (store.franchiseId) {
      item.franchise = { id: store.franchiseId };
    }

    return item;
  }

  /**
   * Convert DynamoDB item to Store entity format
   */
  private fromItemFormat(item: Record<string, any>): Store {
    const store = new Store(
      item.id,
      item.value,
      item.name,
      item.address,
      item.franchiseId,
      item.status || 'active',
      item.createdAt ? new Date(item.createdAt) : undefined,
      item.updatedAt ? new Date(item.updatedAt) : undefined,
    );

    // Set additional optional properties
    if (item.phone) store.phone = item.phone;
    if (item.email) store.email = item.email;
    if (item.openingHours) store.openingHours = item.openingHours;

    return store;
  }
}