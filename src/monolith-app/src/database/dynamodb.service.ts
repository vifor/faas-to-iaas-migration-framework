import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, GetCommand, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

@Injectable()
export class DynamoDBService implements OnModuleInit {
  private readonly logger = new Logger(DynamoDBService.name);
  private client: DynamoDBClient;
  private docClient: DynamoDBDocumentClient;
  private readonly region: string;
  private readonly endpoint?: string;
  private readonly franchiseTableName: string;
  private readonly tenantsTableName: string;

  constructor(private readonly configService: ConfigService) {
    this.region = this.configService.get<string>('aws.region', 'us-east-1');
    this.endpoint = this.configService.get<string>('database.dynamodb.local.endpoint');
    
    // Table names with environment suffix matching existing Lambda pattern
    const env = this.configService.get<string>('aws.env');
    const suffix = env && env !== 'NONE' ? `-${env}` : '';
    
    this.franchiseTableName = `petstoreFranchise${suffix}`;
    this.tenantsTableName = `petstoreTenants${suffix}`;
  }

  async onModuleInit() {
    await this.initializeConnection();
  }

  private async initializeConnection(): Promise<void> {
    try {
      const clientConfig: any = {
        region: this.region,
        maxAttempts: this.configService.get<number>('database.dynamodb.maxRetries', 3),
      };

      // Use local endpoint for development
      if (this.endpoint && this.configService.get<string>('NODE_ENV') === 'development') {
        clientConfig.endpoint = this.endpoint;
        clientConfig.credentials = {
          accessKeyId: 'local',
          secretAccessKey: 'local',
        };
        this.logger.log(`🔗 Connecting to DynamoDB Local at ${this.endpoint}`);
      } else {
        this.logger.log(`🔗 Connecting to DynamoDB in region ${this.region}`);
      }

      this.client = new DynamoDBClient(clientConfig);
      
      this.docClient = DynamoDBDocumentClient.from(this.client, {
        marshallOptions: {
          convertEmptyValues: false,
          removeUndefinedValues: true,
          convertClassInstanceToMap: false,
        },
        unmarshallOptions: {
          wrapNumbers: false,
        },
      });

      await this.testConnection();
      
      this.logger.log('✅ DynamoDB connection established successfully');
      this.logger.log(`📊 Franchise Table: ${this.franchiseTableName}`);
      this.logger.log(`📊 Tenants Table: ${this.tenantsTableName}`);
      
    } catch (error) {
      this.logger.error('❌ Failed to initialize DynamoDB connection', error.stack);
      throw error;
    }
  }

  /**
   * Test DynamoDB connection by attempting to describe tables
   */
  async testConnection(): Promise<boolean> {
    try {
      // Simple test operation that doesn't require specific data
      const testParams = {
        TableName: this.franchiseTableName,
        Key: { id: '__connection_test__' },
      };
      
      await this.docClient.send(new GetCommand(testParams));
      return true;
    } catch (error) {
      if (error.name === 'ResourceNotFoundException') {
        this.logger.warn(`⚠️ Table ${this.franchiseTableName} not found, but connection is working`);
        return true;
      }
      this.logger.error('❌ DynamoDB connection test failed', error.message);
      throw error;
    }
  }

  /**
   * Franchise Table Operations
   */

  // Query franchises (list all or by ID pattern)
  async queryFranchises(options: {
    id?: string;
    limit?: number;
    exclusiveStartKey?: any;
  } = {}) {
    try {
      const params: any = {
        TableName: this.franchiseTableName,
      };

      if (options.id) {
        params.KeyConditionExpression = 'id = :id';
        params.ExpressionAttributeValues = { ':id': options.id };
      }

      if (options.limit) {
        params.Limit = options.limit;
      }

      if (options.exclusiveStartKey) {
        params.ExclusiveStartKey = options.exclusiveStartKey;
      }

      const command = new QueryCommand(params);
      const result = await this.docClient.send(command);
      
      this.logger.debug(`📋 Queried ${result.Items?.length || 0} franchises`);
      return result;
    } catch (error) {
      this.logger.error('❌ Error querying franchises', error.stack);
      throw error;
    }
  }

  // Get single franchise by ID
  async getFranchise(id: string) {
    try {
      const params = {
        TableName: this.franchiseTableName,
        Key: { id },
      };

      const command = new GetCommand(params);
      const result = await this.docClient.send(command);
      
      if (result.Item) {
        this.logger.debug(`📋 Retrieved franchise: ${id}`);
      } else {
        this.logger.debug(`📋 Franchise not found: ${id}`);
      }
      
      return result.Item;
    } catch (error) {
      this.logger.error(`❌ Error getting franchise ${id}`, error.stack);
      throw error;
    }
  }

  // Create or update franchise
  async putFranchise(franchise: any) {
    try {
      const params = {
        TableName: this.franchiseTableName,
        Item: {
          ...franchise,
          updatedAt: new Date().toISOString(),
        },
      };

      const command = new PutCommand(params);
      const result = await this.docClient.send(command);
      
      this.logger.debug(`📋 Saved franchise: ${franchise.id}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Error saving franchise ${franchise.id}`, error.stack);
      throw error;
    }
  }

  // Delete franchise
  async deleteFranchise(id: string) {
    try {
      const params = {
        TableName: this.franchiseTableName,
        Key: { id },
      };

      const command = new DeleteCommand(params);
      const result = await this.docClient.send(command);
      
      this.logger.debug(`📋 Deleted franchise: ${id}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Error deleting franchise ${id}`, error.stack);
      throw error;
    }
  }

  /**
   * Tenants (Stores) Table Operations - Composite Key (id, value)
   */

  // Query stores by store ID (returns all values for a store)
  async queryStores(options: {
    id?: string;
    value?: string;
    limit?: number;
    exclusiveStartKey?: any;
  } = {}) {
    try {
      const params: any = {
        TableName: this.tenantsTableName,
      };

      if (options.id) {
        params.KeyConditionExpression = 'id = :id';
        params.ExpressionAttributeValues = { ':id': options.id };
        
        if (options.value) {
          params.KeyConditionExpression += ' AND #value = :value';
          params.ExpressionAttributeValues[':value'] = options.value;
          params.ExpressionAttributeNames = { '#value': 'value' };
        }
      }

      if (options.limit) {
        params.Limit = options.limit;
      }

      if (options.exclusiveStartKey) {
        params.ExclusiveStartKey = options.exclusiveStartKey;
      }

      const command = new QueryCommand(params);
      const result = await this.docClient.send(command);
      
      this.logger.debug(`🏪 Queried ${result.Items?.length || 0} stores`);
      return result;
    } catch (error) {
      this.logger.error('❌ Error querying stores', error.stack);
      throw error;
    }
  }

  // Get single store by composite key (id, value)
  async getStore(id: string, value: string) {
    try {
      const params = {
        TableName: this.tenantsTableName,
        Key: { id, value },
      };

      const command = new GetCommand(params);
      const result = await this.docClient.send(command);
      
      if (result.Item) {
        this.logger.debug(`🏪 Retrieved store: ${id}/${value}`);
      } else {
        this.logger.debug(`🏪 Store not found: ${id}/${value}`);
      }
      
      return result.Item;
    } catch (error) {
      this.logger.error(`❌ Error getting store ${id}/${value}`, error.stack);
      throw error;
    }
  }

  // Create or update store
  async putStore(store: any) {
    try {
      const params = {
        TableName: this.tenantsTableName,
        Item: {
          ...store,
          updatedAt: new Date().toISOString(),
        },
      };

      const command = new PutCommand(params);
      const result = await this.docClient.send(command);
      
      this.logger.debug(`🏪 Saved store: ${store.id}/${store.value}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Error saving store ${store.id}/${store.value}`, error.stack);
      throw error;
    }
  }

  // Delete store by composite key
  async deleteStore(id: string, value: string) {
    try {
      const params = {
        TableName: this.tenantsTableName,
        Key: { id, value },
      };

      const command = new DeleteCommand(params);
      const result = await this.docClient.send(command);
      
      this.logger.debug(`🏪 Deleted store: ${id}/${value}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Error deleting store ${id}/${value}`, error.stack);
      throw error;
    }
  }

  /**
   * Utility methods
   */

  // Get table names for external use
  getTableNames() {
    return {
      franchise: this.franchiseTableName,
      tenants: this.tenantsTableName,
    };
  }

  // Get raw clients for advanced operations
  getClients() {
    return {
      client: this.client,
      docClient: this.docClient,
    };
  }

  // Health check method
  async isHealthy(): Promise<boolean> {
    try {
      await this.testConnection();
      return true;
    } catch (error) {
      return false;
    }
  }
}