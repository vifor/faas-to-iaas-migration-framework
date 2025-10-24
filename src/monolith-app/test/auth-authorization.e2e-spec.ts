import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { TestUtils } from './test-utils';

describe('Store Operations - Authentication & Authorization (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await TestUtils.createTestApp();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(() => {
    TestUtils.resetMocks();
    TestUtils.mockStoreOperations();
    TestUtils.mockPetOperations();
    TestUtils.mockOrderOperations();
  });

  describe('JWT Authentication Tests', () => {
    const validToken = TestUtils.generateJwtToken();
    const invalidToken = 'invalid.jwt.token';
    const expiredToken = TestUtils.generateJwtToken({ exp: Math.floor(Date.now() / 1000) - 3600 });

    describe('Pet Operations Authentication', () => {
      it('should allow access with valid JWT token', async () => {
        const response = await request(app.getHttpServer())
          .get('/store/store-001/pets')
          .set('Authorization', `Bearer ${validToken}`)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(Array.isArray(response.body.pets)).toBe(true);
      });

      it('should deny access without JWT token', async () => {
        await request(app.getHttpServer())
          .get('/store/store-001/pets')
          .expect(401);
      });

      it('should deny access with invalid JWT token', async () => {
        await request(app.getHttpServer())
          .get('/store/store-001/pets')
          .set('Authorization', `Bearer ${invalidToken}`)
          .expect(401);
      });

      it('should deny access with expired JWT token', async () => {
        await request(app.getHttpServer())
          .get('/store/store-001/pets')
          .set('Authorization', `Bearer ${expiredToken}`)
          .expect(401);
      });

      it('should deny access with malformed Authorization header', async () => {
        await request(app.getHttpServer())
          .get('/store/store-001/pets')
          .set('Authorization', validToken) // Missing 'Bearer '
          .expect(401);
      });
    });

    describe('Order Operations Authentication', () => {
      it('should allow access to orders with valid JWT token', async () => {
        const response = await request(app.getHttpServer())
          .get('/store/store-001/orders')
          .set('Authorization', `Bearer ${validToken}`)
          .expect(200);

        expect(response.body).toBeDefined();
      });

      it('should deny order creation without JWT token', async () => {
        const orderData = TestUtils.getTestData().validOrder;

        await request(app.getHttpServer())
          .post('/store/store-001/order/create')
          .send(orderData)
          .expect(401);
      });
    });

    describe('Inventory Operations Authentication', () => {
      it('should allow inventory access with valid JWT token', async () => {
        TestUtils.mockInventoryOperations();

        const response = await request(app.getHttpServer())
          .get('/store/store-001/inventory')
          .set('Authorization', `Bearer ${validToken}`)
          .expect(200);

        expect(response.body).toBeDefined();
      });

      it('should deny inventory access without JWT token', async () => {
        await request(app.getHttpServer())
          .get('/store/store-001/inventory')
          .expect(401);
      });
    });
  });

  describe('Authorization Tests - Store Access Control', () => {
    describe('Store Owner Authorization', () => {
      const storeOwnerToken = TestUtils.generateJwtToken({
        'cognito:groups': ['StoreOwner'],
        'custom:employment': JSON.stringify([{
          franchiseId: 'franchise-001',
          storeId: 'store-001',
          role: 'StoreOwner'
        }])
      });

      it('should allow store owner to access their store pets', async () => {
        const response = await request(app.getHttpServer())
          .get('/store/store-001/pets')
          .set('Authorization', `Bearer ${storeOwnerToken}`)
          .expect(200);

        expect(response.body).toBeDefined();
      });

      it('should deny store owner access to other store pets', async () => {
        await request(app.getHttpServer())
          .get('/store/store-002/pets')
          .set('Authorization', `Bearer ${storeOwnerToken}`)
          .expect(403);
      });

      it('should allow store owner to create pets in their store', async () => {
        const petData = TestUtils.getTestData().validPet;

        const response = await request(app.getHttpServer())
          .post('/store/store-001/pet/create')
          .set('Authorization', `Bearer ${storeOwnerToken}`)
          .send(petData)
          .expect(201);

        expect(response.body.success).toBeDefined();
      });

      it('should deny store owner creating pets in other stores', async () => {
        const petData = TestUtils.getTestData().validPet;

        await request(app.getHttpServer())
          .post('/store/store-002/pet/create')
          .set('Authorization', `Bearer ${storeOwnerToken}`)
          .send(petData)
          .expect(403);
      });
    });

    describe('Franchise Owner Authorization', () => {
      const franchiseOwnerToken = TestUtils.generateJwtToken({
        'cognito:groups': ['FranchiseOwner'],
        'custom:employment': JSON.stringify([{
          franchiseId: 'franchise-001',
          role: 'FranchiseOwner'
        }])
      });

      it('should allow franchise owner to access stores in their franchise', async () => {
        const response = await request(app.getHttpServer())
          .get('/store/store-001/pets')
          .set('Authorization', `Bearer ${franchiseOwnerToken}`)
          .expect(200);

        expect(response.body).toBeDefined();
      });

      it('should deny franchise owner access to stores outside their franchise', async () => {
        TestUtils.mockStoreOperations();
        // Mock store that belongs to different franchise
        TestUtils.dynamoMock.on(require('@aws-sdk/lib-dynamodb').GetCommand).resolves({
          Item: {
            id: 'store-003',
            franchiseId: 'franchise-002',
            name: 'Other Franchise Store'
          }
        });

        await request(app.getHttpServer())
          .get('/store/store-003/pets')
          .set('Authorization', `Bearer ${franchiseOwnerToken}`)
          .expect(403);
      });

      it('should allow franchise owner to manage pets across franchise stores', async () => {
        const petData = TestUtils.getTestData().validPet;

        const response = await request(app.getHttpServer())
          .post('/store/store-001/pet/create')
          .set('Authorization', `Bearer ${franchiseOwnerToken}`)
          .send(petData)
          .expect(201);

        expect(response.body.success).toBeDefined();
      });
    });

    describe('Customer Authorization', () => {
      const customerToken = TestUtils.generateJwtToken({
        'cognito:groups': ['Customer'],
        'custom:customerId': 'customer-001'
      });

      it('should allow customers to search pets', async () => {
        const response = await request(app.getHttpServer())
          .get('/store/store-001/pets')
          .set('Authorization', `Bearer ${customerToken}`)
          .expect(200);

        expect(response.body).toBeDefined();
      });

      it('should allow customers to view specific pets', async () => {
        const response = await request(app.getHttpServer())
          .get('/store/store-001/pet/get/pet-001')
          .set('Authorization', `Bearer ${customerToken}`)
          .expect(200);

        expect(response.body).toBeDefined();
      });

      it('should allow customers to place orders', async () => {
        const orderData = TestUtils.getTestData().validOrder;

        const response = await request(app.getHttpServer())
          .post('/store/store-001/order/create')
          .set('Authorization', `Bearer ${customerToken}`)
          .send(orderData)
          .expect(201);

        expect(response.body.success).toBeDefined();
      });

      it('should deny customers creating pets', async () => {
        const petData = TestUtils.getTestData().validPet;

        await request(app.getHttpServer())
          .post('/store/store-001/pet/create')
          .set('Authorization', `Bearer ${customerToken}`)
          .send(petData)
          .expect(403);
      });

      it('should deny customers updating pets', async () => {
        const updateData = { name: 'Updated Pet', price: 1500 };

        await request(app.getHttpServer())
          .put('/store/store-001/pet/update/pet-001')
          .set('Authorization', `Bearer ${customerToken}`)
          .send(updateData)
          .expect(403);
      });

      it('should deny customers accessing inventory', async () => {
        await request(app.getHttpServer())
          .get('/store/store-001/inventory')
          .set('Authorization', `Bearer ${customerToken}`)
          .expect(403);
      });
    });

    describe('Multiple Store Access', () => {
      const multiStoreToken = TestUtils.generateJwtToken({
        'cognito:groups': ['StoreOwner'],
        'custom:employment': JSON.stringify([
          {
            franchiseId: 'franchise-001',
            storeId: 'store-001',
            role: 'StoreOwner'
          },
          {
            franchiseId: 'franchise-001',
            storeId: 'store-002',
            role: 'StoreOwner'
          }
        ])
      });

      it('should allow access to multiple owned stores', async () => {
        // Test access to first store
        await request(app.getHttpServer())
          .get('/store/store-001/pets')
          .set('Authorization', `Bearer ${multiStoreToken}`)
          .expect(200);

        // Test access to second store
        await request(app.getHttpServer())
          .get('/store/store-002/pets')
          .set('Authorization', `Bearer ${multiStoreToken}`)
          .expect(200);
      });

      it('should deny access to non-owned stores', async () => {
        await request(app.getHttpServer())
          .get('/store/store-003/pets')
          .set('Authorization', `Bearer ${multiStoreToken}`)
          .expect(403);
      });
    });
  });

  describe('API Key Authentication Tests (Admin Endpoints)', () => {
    const validApiKey = process.env.API_KEY || 'test-api-key';
    const invalidApiKey = 'invalid-api-key';

    it('should allow admin franchise access with valid API key', async () => {
      TestUtils.mockFranchiseOperations();

      const response = await request(app.getHttpServer())
        .get('/admin/franchise')
        .set('x-api-key', validApiKey)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should deny admin franchise access without API key', async () => {
      await request(app.getHttpServer())
        .get('/admin/franchise')
        .expect(403);
    });

    it('should deny admin franchise access with invalid API key', async () => {
      await request(app.getHttpServer())
        .get('/admin/franchise')
        .set('x-api-key', invalidApiKey)
        .expect(403);
    });

    it('should allow admin store access with valid API key', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/store')
        .set('x-api-key', validApiKey)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should deny JWT token access to admin endpoints', async () => {
      const jwtToken = TestUtils.generateJwtToken();

      await request(app.getHttpServer())
        .get('/admin/franchise')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(403);
    });
  });

  describe('Cross-Origin and Security Headers', () => {
    it('should include security headers in responses', async () => {
      const validToken = TestUtils.generateJwtToken();

      const response = await request(app.getHttpServer())
        .get('/store/store-001/pets')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      // Check for security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
    });

    it('should handle preflight CORS requests', async () => {
      await request(app.getHttpServer())
        .options('/store/store-001/pets')
        .set('Origin', 'https://petstore.example.com')
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'Authorization')
        .expect(200);
    });
  });
});