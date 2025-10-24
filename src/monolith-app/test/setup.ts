/// <reference types="jest" />
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// Global test configuration
let app: INestApplication | undefined;
let dynamoMock: any;

beforeAll(async () => {
  // Create DynamoDB mock client
  dynamoMock = mockClient(DynamoDBDocumentClient);
  
  // Set environment variables for testing
  process.env.NODE_ENV = 'test';
  process.env.AWS_REGION = 'us-east-1';
  process.env.DYNAMODB_FRANCHISE_TABLE = 'test-petstoreFranchise';
  process.env.DYNAMODB_STORE_TABLE = 'test-petstoreTenants';
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.API_KEY = 'test-api-key';
});

afterAll(async () => {
  if (app) {
    await app.close();
  }
});

beforeEach(() => {
  // Reset DynamoDB mock before each test
  dynamoMock.reset();
});

export { app, dynamoMock };