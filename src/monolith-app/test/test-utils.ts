import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { AppModule } from '../src/app.module';

export class TestUtils {
  static dynamoMock = mockClient(DynamoDBDocumentClient);

  /**
   * Create a test application instance
   */
  static async createTestApp(): Promise<INestApplication> {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    
    await app.init();
    return app;
  }

  /**
   * Generate a valid JWT token for testing store endpoints
   */
  static generateJwtToken(payload: any = {}): string {
    const jwt = require('jsonwebtoken');
    const defaultPayload = {
      sub: 'test-user-123',
      email: 'test@example.com',
      'cognito:groups': ['StoreOwner'],
      'custom:employment': JSON.stringify([{
        franchiseId: 'franchise-001',
        storeId: 'store-001',
        role: 'StoreOwner'
      }]),
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600
    };
    
    return jwt.sign({ ...defaultPayload, ...payload }, process.env.JWT_SECRET || 'test-secret');
  }

  /**
   * Mock DynamoDB responses for franchise operations
   */
  static mockFranchiseOperations() {
    // Mock franchise list (Scan)
    this.dynamoMock.on(ScanCommand).resolves({
      Items: [
        {
          id: 'franchise-001',
          name: 'Pet Paradise Downtown',
          location: 'New York, NY',
          stores: ['store-001', 'store-002']
        },
        {
          id: 'franchise-002',
          name: 'Pet Paradise Uptown',
          location: 'Boston, MA',
          stores: ['store-003']
        }
      ]
    });

    // Mock franchise get by ID
    this.dynamoMock.on(GetCommand).resolves({
      Item: {
        id: 'franchise-001',
        name: 'Pet Paradise Downtown',
        location: 'New York, NY',
        stores: ['store-001', 'store-002']
      }
    });

    // Mock franchise create/update (Put)
    this.dynamoMock.on(PutCommand).resolves({});

    // Mock franchise delete
    this.dynamoMock.on(DeleteCommand).resolves({});
  }

  /**
   * Mock DynamoDB responses for store operations
   */
  static mockStoreOperations() {
    // Mock store list (Query)
    this.dynamoMock.on(QueryCommand).resolves({
      Items: [
        {
          id: 'store-001',
          value: 'store-data',
          franchiseId: 'franchise-001',
          name: 'Downtown Pet Store',
          address: '123 Main St, New York, NY',
          manager: 'John Doe',
          phone: '+1-555-0123'
        }
      ]
    });

    // Mock store get by composite key
    this.dynamoMock.on(GetCommand, {
      Key: { id: 'store-001', value: 'store-data' }
    }).resolves({
      Item: {
        id: 'store-001',
        value: 'store-data',
        franchiseId: 'franchise-001',
        name: 'Downtown Pet Store',
        address: '123 Main St, New York, NY',
        manager: 'John Doe',
        phone: '+1-555-0123'
      }
    });

    // Mock store operations
    this.dynamoMock.on(PutCommand).resolves({});
    this.dynamoMock.on(DeleteCommand).resolves({});
  }

  /**
   * Mock DynamoDB responses for pet operations
   */
  static mockPetOperations() {
    // Mock pet list for store
    this.dynamoMock.on(QueryCommand, {
      IndexName: 'StoreIndex'
    }).resolves({
      Items: [
        {
          id: 'pet-001',
          storeId: 'store-001',
          name: 'Buddy',
          species: 'Dog',
          breed: 'Golden Retriever',
          age: 3,
          price: 1200.00,
          status: 'available',
          description: 'Friendly golden retriever puppy'
        },
        {
          id: 'pet-002',
          storeId: 'store-001',
          name: 'Whiskers',
          species: 'Cat',
          breed: 'Persian',
          age: 2,
          price: 800.00,
          status: 'available',
          description: 'Beautiful persian cat'
        }
      ]
    });

    // Mock individual pet operations
    this.dynamoMock.on(GetCommand).resolves({
      Item: {
        id: 'pet-001',
        storeId: 'store-001',
        name: 'Buddy',
        species: 'Dog',
        breed: 'Golden Retriever',
        age: 3,
        price: 1200.00,
        status: 'available',
        description: 'Friendly golden retriever puppy'
      }
    });

    this.dynamoMock.on(PutCommand).resolves({});
    this.dynamoMock.on(DeleteCommand).resolves({});
  }

  /**
   * Mock DynamoDB responses for order operations
   */
  static mockOrderOperations() {
    // Mock order list for store
    this.dynamoMock.on(QueryCommand, {
      IndexName: 'StoreIndex'
    }).resolves({
      Items: [
        {
          id: 'order-001',
          storeId: 'store-001',
          customerId: 'customer-001',
          petId: 'pet-001',
          quantity: 1,
          totalPrice: 1200.00,
          status: 'pending',
          orderDate: '2024-01-15T10:30:00Z'
        }
      ]
    });

    // Mock individual order operations
    this.dynamoMock.on(GetCommand).resolves({
      Item: {
        id: 'order-001',
        storeId: 'store-001',
        customerId: 'customer-001',
        petId: 'pet-001',
        quantity: 1,
        totalPrice: 1200.00,
        status: 'pending',
        orderDate: '2024-01-15T10:30:00Z'
      }
    });

    this.dynamoMock.on(PutCommand).resolves({});
    this.dynamoMock.on(DeleteCommand).resolves({});
  }

  /**
   * Mock inventory operations
   */
  static mockInventoryOperations() {
    this.dynamoMock.on(QueryCommand, {
      IndexName: 'StoreIndex'
    }).resolves({
      Items: [
        {
          id: 'inventory-item-001',
          storeId: 'store-001',
          itemType: 'pet',
          itemId: 'pet-001',
          quantity: 1,
          lastUpdated: '2024-01-15T10:30:00Z'
        },
        {
          id: 'inventory-item-002',
          storeId: 'store-001',
          itemType: 'pet',
          itemId: 'pet-002',
          quantity: 1,
          lastUpdated: '2024-01-15T10:30:00Z'
        }
      ]
    });
  }

  /**
   * Reset all mocks
   */
  static resetMocks() {
    this.dynamoMock.reset();
  }

  /**
   * Create test data for different scenarios
   */
  static getTestData() {
    return {
      validFranchise: {
        id: 'franchise-test-001',
        name: 'Test Franchise',
        location: 'Test City, TC',
        stores: ['store-test-001']
      },
      validStore: {
        id: 'store-test-001',
        franchiseId: 'franchise-test-001',
        name: 'Test Store',
        address: '123 Test St, Test City, TC',
        manager: 'Test Manager',
        phone: '+1-555-TEST'
      },
      validPet: {
        name: 'Test Pet',
        species: 'Dog',
        breed: 'Test Breed',
        age: 2,
        price: 500.00,
        status: 'available',
        description: 'Test pet for testing'
      },
      validOrder: {
        customerId: 'customer-test-001',
        petId: 'pet-test-001',
        quantity: 1,
        totalPrice: 500.00,
        status: 'pending'
      }
    };
  }

  /**
   * API endpoints for testing
   */
  static getEndpoints() {
    return {
      // Admin franchise endpoints
      adminFranchise: '/admin/franchise',
      adminFranchiseById: (id: string) => `/admin/franchise/${id}`,
      
      // Admin store endpoints  
      adminStore: '/admin/store',
      adminStoreById: (id: string, value: string) => `/admin/store/${id}/${value}`,
      
      // Store operation endpoints
      storePets: (storeId: string) => `/store/${storeId}/pets`,
      storePet: (storeId: string, petId: string) => `/store/${storeId}/pet/${petId}`,
      storePetCreate: (storeId: string) => `/store/${storeId}/pet/create`,
      storePetUpdate: (storeId: string, petId: string) => `/store/${storeId}/pet/update/${petId}`,
      
      storeOrders: (storeId: string) => `/store/${storeId}/orders`,
      storeOrder: (storeId: string, orderId: string) => `/store/${storeId}/order/${orderId}`,
      storeOrderCreate: (storeId: string) => `/store/${storeId}/order/create`,
      storeOrderUpdate: (storeId: string, orderId: string) => `/store/${storeId}/order/update/${orderId}`,
      
      storeInventory: (storeId: string) => `/store/${storeId}/inventory`,
      
      // Health check
      health: '/health'
    };
  }
}