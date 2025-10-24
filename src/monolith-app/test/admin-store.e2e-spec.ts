import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { TestUtils } from './test-utils';

describe('Admin Store Endpoints (e2e)', () => {
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
  });

  describe('/admin/store (GET)', () => {
    it('should list all stores with valid API key', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/store')
        .set('x-api-key', process.env.API_KEY || 'test-api-key')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body.stores)).toBe(true);
    });

    it('should return 403 without API key', async () => {
      await request(app.getHttpServer())
        .get('/admin/store')
        .expect(403);
    });

    it('should return 403 with invalid API key', async () => {
      await request(app.getHttpServer())
        .get('/admin/store')
        .set('x-api-key', 'invalid-key')
        .expect(403);
    });

    it('should handle pagination parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/store?limit=10')
        .set('x-api-key', process.env.API_KEY || 'test-api-key')
        .expect(200);

      expect(response.body.stores).toBeDefined();
      expect(response.body.hasMore).toBeDefined();
    });
  });

  describe('/admin/store/:id/:value (GET)', () => {
    it('should get store by composite key with valid API key', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/store/store-001/store-data')
        .set('x-api-key', process.env.API_KEY || 'test-api-key')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBe('store-001');
      expect(response.body.name).toBeDefined();
      expect(response.body.address).toBeDefined();
    });

    it('should return 404 for non-existent store', async () => {
      TestUtils.dynamoMock.reset();
      TestUtils.dynamoMock.on(require('@aws-sdk/lib-dynamodb').GetCommand).resolves({ Item: null });

      await request(app.getHttpServer())
        .get('/admin/store/non-existent/store-data')
        .set('x-api-key', process.env.API_KEY || 'test-api-key')
        .expect(404);
    });
  });

  describe('/admin/store (POST)', () => {
    const validStoreData = TestUtils.getTestData().validStore;

    it('should create store with valid data and API key', async () => {
      TestUtils.dynamoMock.reset();
      // Mock that store doesn't exist
      TestUtils.dynamoMock.on(require('@aws-sdk/lib-dynamodb').GetCommand).resolves({ Item: null });
      // Mock successful creation
      TestUtils.dynamoMock.on(require('@aws-sdk/lib-dynamodb').PutCommand).resolves({});

      const response = await request(app.getHttpServer())
        .post('/admin/store')
        .set('x-api-key', process.env.API_KEY || 'test-api-key')
        .send(validStoreData)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBeTruthy();
    });

    it('should return 400 for invalid store data', async () => {
      const invalidData = { ...validStoreData, name: '' };

      await request(app.getHttpServer())
        .post('/admin/store')
        .set('x-api-key', process.env.API_KEY || 'test-api-key')
        .send(invalidData)
        .expect(400);
    });

    it('should return 409 for duplicate store composite key', async () => {
      TestUtils.dynamoMock.reset();
      // Mock that store already exists
      TestUtils.dynamoMock.on(require('@aws-sdk/lib-dynamodb').GetCommand).resolves({
        Item: validStoreData
      });

      await request(app.getHttpServer())
        .post('/admin/store')
        .set('x-api-key', process.env.API_KEY || 'test-api-key')
        .send(validStoreData)
        .expect(409);
    });

    it('should validate required fields', async () => {
      const incompleteData = { name: 'Test' }; // Missing required fields

      await request(app.getHttpServer())
        .post('/admin/store')
        .set('x-api-key', process.env.API_KEY || 'test-api-key')
        .send(incompleteData)
        .expect(400);
    });
  });

  describe('/admin/store/:id/:value (PUT)', () => {
    const updateData = {
      name: 'Updated Store Name',
      address: 'Updated Address',
      manager: 'Updated Manager',
      phone: '+1-555-UPDATED'
    };

    it('should update store with valid data', async () => {
      TestUtils.mockStoreOperations();

      const response = await request(app.getHttpServer())
        .put('/admin/store/store-001/store-data')
        .set('x-api-key', process.env.API_KEY || 'test-api-key')
        .send(updateData)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should return 404 when updating non-existent store', async () => {
      TestUtils.dynamoMock.reset();
      TestUtils.dynamoMock.on(require('@aws-sdk/lib-dynamodb').GetCommand).resolves({ Item: null });

      await request(app.getHttpServer())
        .put('/admin/store/non-existent/store-data')
        .set('x-api-key', process.env.API_KEY || 'test-api-key')
        .send(updateData)
        .expect(404);
    });
  });

  describe('/admin/store/:id/:value (DELETE)', () => {
    it('should delete store when no pets or orders exist', async () => {
      TestUtils.mockStoreOperations();
      // Mock no pets or orders for this store
      TestUtils.dynamoMock.on(require('@aws-sdk/lib-dynamodb').QueryCommand).resolves({ Items: [] });

      await request(app.getHttpServer())
        .delete('/admin/store/store-001/store-data')
        .set('x-api-key', process.env.API_KEY || 'test-api-key')
        .expect(200);
    });

    it('should return 409 when store has pets', async () => {
      TestUtils.mockStoreOperations();
      // Mock pets exist for this store
      TestUtils.dynamoMock.on(require('@aws-sdk/lib-dynamodb').QueryCommand).resolves({
        Items: [{ id: 'pet-001', storeId: 'store-001' }]
      });

      await request(app.getHttpServer())
        .delete('/admin/store/store-001/store-data')
        .set('x-api-key', process.env.API_KEY || 'test-api-key')
        .expect(409);
    });

    it('should return 404 for non-existent store', async () => {
      TestUtils.dynamoMock.reset();
      TestUtils.dynamoMock.on(require('@aws-sdk/lib-dynamodb').GetCommand).resolves({ Item: null });

      await request(app.getHttpServer())
        .delete('/admin/store/non-existent/store-data')
        .set('x-api-key', process.env.API_KEY || 'test-api-key')
        .expect(404);
    });
  });

  describe('/admin/store/:id/:value/stats (GET)', () => {
    it('should get store statistics', async () => {
      TestUtils.mockStoreOperations();
      TestUtils.mockPetOperations();
      TestUtils.mockOrderOperations();

      const response = await request(app.getHttpServer())
        .get('/admin/store/store-001/store-data/stats')
        .set('x-api-key', process.env.API_KEY || 'test-api-key')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.store).toBeDefined();
      expect(response.body.petCount).toBeDefined();
      expect(response.body.orderCount).toBeDefined();
      expect(response.body.revenue).toBeDefined();
    });
  });
});