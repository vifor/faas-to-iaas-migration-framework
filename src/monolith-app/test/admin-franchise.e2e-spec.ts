import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { TestUtils } from './test-utils';

describe('Admin Franchise Endpoints (e2e)', () => {
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
    TestUtils.mockFranchiseOperations();
  });

  describe('/admin/franchise (GET)', () => {
    it('should list all franchises with valid API key', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/franchise')
        .set('x-api-key', process.env.API_KEY || 'test-api-key')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body.franchises)).toBe(true);
    });

    it('should return 403 without API key', async () => {
      await request(app.getHttpServer())
        .get('/admin/franchise')
        .expect(403);
    });

    it('should return 403 with invalid API key', async () => {
      await request(app.getHttpServer())
        .get('/admin/franchise')
        .set('x-api-key', 'invalid-key')
        .expect(403);
    });

    it('should handle pagination parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/franchise?limit=10')
        .set('x-api-key', process.env.API_KEY || 'test-api-key')
        .expect(200);

      expect(response.body.franchises).toBeDefined();
      expect(response.body.hasMore).toBeDefined();
    });
  });

  describe('/admin/franchise/:id (GET)', () => {
    it('should get franchise by ID with valid API key', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/franchise/franchise-001')
        .set('x-api-key', process.env.API_KEY || 'test-api-key')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBe('franchise-001');
      expect(response.body.name).toBeDefined();
      expect(response.body.location).toBeDefined();
    });

    it('should return 404 for non-existent franchise', async () => {
      TestUtils.dynamoMock.reset();
      TestUtils.dynamoMock.on(require('@aws-sdk/lib-dynamodb').GetCommand).resolves({ Item: null });

      await request(app.getHttpServer())
        .get('/admin/franchise/non-existent')
        .set('x-api-key', process.env.API_KEY || 'test-api-key')
        .expect(404);
    });
  });

  describe('/admin/franchise (POST)', () => {
    const validFranchiseData = TestUtils.getTestData().validFranchise;

    it('should create franchise with valid data and API key', async () => {
      TestUtils.dynamoMock.reset();
      // Mock that franchise doesn't exist
      TestUtils.dynamoMock.on(require('@aws-sdk/lib-dynamodb').GetCommand).resolves({ Item: null });
      // Mock successful creation
      TestUtils.dynamoMock.on(require('@aws-sdk/lib-dynamodb').PutCommand).resolves({});

      const response = await request(app.getHttpServer())
        .post('/admin/franchise')
        .set('x-api-key', process.env.API_KEY || 'test-api-key')
        .send(validFranchiseData)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBeTruthy();
    });

    it('should return 400 for invalid franchise data', async () => {
      const invalidData = { ...validFranchiseData, name: '' };

      await request(app.getHttpServer())
        .post('/admin/franchise')
        .set('x-api-key', process.env.API_KEY || 'test-api-key')
        .send(invalidData)
        .expect(400);
    });

    it('should return 409 for duplicate franchise ID', async () => {
      TestUtils.dynamoMock.reset();
      // Mock that franchise already exists
      TestUtils.dynamoMock.on(require('@aws-sdk/lib-dynamodb').GetCommand).resolves({
        Item: validFranchiseData
      });

      await request(app.getHttpServer())
        .post('/admin/franchise')
        .set('x-api-key', process.env.API_KEY || 'test-api-key')
        .send(validFranchiseData)
        .expect(409);
    });

    it('should validate required fields', async () => {
      const incompleteData = { name: 'Test' }; // Missing id

      await request(app.getHttpServer())
        .post('/admin/franchise')
        .set('x-api-key', process.env.API_KEY || 'test-api-key')
        .send(incompleteData)
        .expect(400);
    });
  });

  describe('/admin/franchise/:id (PUT)', () => {
    const updateData = {
      name: 'Updated Franchise Name',
      location: 'Updated Location'
    };

    it('should update franchise with valid data', async () => {
      TestUtils.mockFranchiseOperations();

      const response = await request(app.getHttpServer())
        .put('/admin/franchise/franchise-001')
        .set('x-api-key', process.env.API_KEY || 'test-api-key')
        .send(updateData)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should return 404 when updating non-existent franchise', async () => {
      TestUtils.dynamoMock.reset();
      TestUtils.dynamoMock.on(require('@aws-sdk/lib-dynamodb').GetCommand).resolves({ Item: null });

      await request(app.getHttpServer())
        .put('/admin/franchise/non-existent')
        .set('x-api-key', process.env.API_KEY || 'test-api-key')
        .send(updateData)
        .expect(404);
    });
  });

  describe('/admin/franchise/:id (DELETE)', () => {
    it('should delete franchise when no stores exist', async () => {
      TestUtils.mockFranchiseOperations();
      // Mock no stores for this franchise
      TestUtils.dynamoMock.on(require('@aws-sdk/lib-dynamodb').QueryCommand).resolves({ Items: [] });

      await request(app.getHttpServer())
        .delete('/admin/franchise/franchise-001')
        .set('x-api-key', process.env.API_KEY || 'test-api-key')
        .expect(200);
    });

    it('should return 409 when franchise has stores', async () => {
      TestUtils.mockFranchiseOperations();
      // Mock stores exist for this franchise
      TestUtils.dynamoMock.on(require('@aws-sdk/lib-dynamodb').QueryCommand).resolves({
        Items: [{ id: 'store-001', franchiseId: 'franchise-001' }]
      });

      await request(app.getHttpServer())
        .delete('/admin/franchise/franchise-001')
        .set('x-api-key', process.env.API_KEY || 'test-api-key')
        .expect(409);
    });

    it('should return 404 for non-existent franchise', async () => {
      TestUtils.dynamoMock.reset();
      TestUtils.dynamoMock.on(require('@aws-sdk/lib-dynamodb').GetCommand).resolves({ Item: null });

      await request(app.getHttpServer())
        .delete('/admin/franchise/non-existent')
        .set('x-api-key', process.env.API_KEY || 'test-api-key')
        .expect(404);
    });
  });

  describe('/admin/franchise/:id/stats (GET)', () => {
    it('should get franchise statistics', async () => {
      TestUtils.mockFranchiseOperations();
      TestUtils.mockStoreOperations();

      const response = await request(app.getHttpServer())
        .get('/admin/franchise/franchise-001/stats')
        .set('x-api-key', process.env.API_KEY || 'test-api-key')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.franchise).toBeDefined();
      expect(response.body.storeCount).toBeDefined();
      expect(response.body.activeStores).toBeDefined();
      expect(response.body.inactiveStores).toBeDefined();
    });
  });
});