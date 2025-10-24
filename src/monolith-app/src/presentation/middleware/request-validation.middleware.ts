/**
 * Request Validation Middleware
 * 
 * Validates incoming requests for security, data integrity, and API compliance.
 * Provides early validation before request reaches controllers and business logic.
 */

import { Injectable, NestMiddleware, BadRequestException, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

export interface ValidationRule {
  field: string;
  type: 'string' | 'number' | 'email' | 'uuid' | 'required';
  message?: string;
}

@Injectable()
export class RequestValidationMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestValidationMiddleware.name);

  // Request size limits (in bytes)
  private readonly MAX_JSON_SIZE = 1024 * 1024; // 1MB
  private readonly MAX_URL_LENGTH = 2048; // 2KB

  // Security validation patterns
  private readonly patterns = {
    uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    storeId: /^[a-zA-Z0-9_-]{1,50}$/,
    franchiseId: /^[a-zA-Z0-9_-]{1,50}$/,
    petId: /^[a-zA-Z0-9_-]{1,50}$/,
    orderNumber: /^[a-zA-Z0-9_-]{1,50}$/,
    // Prevent common injection patterns
    sqlInjection: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b|[';\"\\])/i,
    xss: /(<script|<iframe|<object|<embed|javascript:|vbscript:|onload=|onerror=)/i,
  };

  use(req: Request, res: Response, next: NextFunction): void {
    try {
      // Basic security validations
      this.validateRequestSize(req);
      this.validateUrlLength(req);
      this.validateHeaders(req);
      this.validatePathParameters(req);
      this.validateQueryParameters(req);
      
      // Content validation for POST/PUT requests
      if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
        this.validateRequestBody(req);
      }

      // API-specific validations
      this.validateApiSpecificRules(req);

      this.logger.debug(`✅ Request validation passed for ${req.method} ${req.path}`);
      next();

    } catch (error) {
      this.logger.warn(`❌ Request validation failed for ${req.method} ${req.path}: ${error.message}`);
      throw error;
    }
  }

  private validateRequestSize(req: Request): void {
    const contentLength = req.get('Content-Length');
    if (contentLength && parseInt(contentLength) > this.MAX_JSON_SIZE) {
      throw new BadRequestException({
        error: 'Bad Request',
        message: `Request body too large. Maximum size is ${this.MAX_JSON_SIZE} bytes.`,
        statusCode: 400,
      });
    }
  }

  private validateUrlLength(req: Request): void {
    if (req.url.length > this.MAX_URL_LENGTH) {
      throw new BadRequestException({
        error: 'Bad Request',
        message: `URL too long. Maximum length is ${this.MAX_URL_LENGTH} characters.`,
        statusCode: 400,
      });
    }
  }

  private validateHeaders(req: Request): void {
    // Validate required headers for admin endpoints
    if (req.path.startsWith('/api/v1/admin/')) {
      const apiKey = req.get('x-api-key');
      if (!apiKey) {
        throw new BadRequestException({
          error: 'Bad Request',
          message: 'Missing required header: x-api-key',
          statusCode: 400,
        });
      }

      // Basic API key format validation
      if (apiKey.length < 10 || apiKey.length > 100) {
        throw new BadRequestException({
          error: 'Bad Request',
          message: 'Invalid API key format',
          statusCode: 400,
        });
      }
    }

    // Validate Authorization header for store endpoints
    if (req.path.startsWith('/api/v1/store/')) {
      const authHeader = req.get('Authorization');
      if (!authHeader) {
        throw new BadRequestException({
          error: 'Bad Request',
          message: 'Missing required header: Authorization',
          statusCode: 400,
        });
      }

      if (!authHeader.startsWith('Bearer ')) {
        throw new BadRequestException({
          error: 'Bad Request',
          message: 'Invalid Authorization header format. Expected "Bearer <token>"',
          statusCode: 400,
        });
      }
    }

    // Validate Content-Type for body requests
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const contentType = req.get('Content-Type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new BadRequestException({
          error: 'Bad Request',
          message: 'Content-Type must be application/json',
          statusCode: 400,
        });
      }
    }
  }

  private validatePathParameters(req: Request): void {
    const params = req.params;

    // Validate store ID
    if (params.storeId && !this.patterns.storeId.test(params.storeId)) {
      throw new BadRequestException({
        error: 'Bad Request',
        message: 'Invalid store ID format',
        statusCode: 400,
      });
    }

    // Validate franchise ID
    if (params.franchiseId && !this.patterns.franchiseId.test(params.franchiseId)) {
      throw new BadRequestException({
        error: 'Bad Request',
        message: 'Invalid franchise ID format',
        statusCode: 400,
      });
    }

    // Validate pet ID
    if (params.petId && !this.patterns.petId.test(params.petId)) {
      throw new BadRequestException({
        error: 'Bad Request',
        message: 'Invalid pet ID format',
        statusCode: 400,
      });
    }

    // Validate order number
    if (params.orderNumber && !this.patterns.orderNumber.test(params.orderNumber)) {
      throw new BadRequestException({
        error: 'Bad Request',
        message: 'Invalid order number format',
        statusCode: 400,
      });
    }

    // Check for potential injection attacks in path parameters
    Object.values(params).forEach(value => {
      if (typeof value === 'string') {
        this.checkForSecurityThreats(value, 'path parameter');
      }
    });
  }

  private validateQueryParameters(req: Request): void {
    const query = req.query;

    // Validate common query parameters
    if (query.limit) {
      const limit = parseInt(query.limit as string);
      if (isNaN(limit) || limit < 1 || limit > 100) {
        throw new BadRequestException({
          error: 'Bad Request',
          message: 'Invalid limit parameter. Must be between 1 and 100.',
          statusCode: 400,
        });
      }
    }

    if (query.offset) {
      const offset = parseInt(query.offset as string);
      if (isNaN(offset) || offset < 0) {
        throw new BadRequestException({
          error: 'Bad Request',
          message: 'Invalid offset parameter. Must be 0 or greater.',
          statusCode: 400,
        });
      }
    }

    // Check for security threats in query parameters
    Object.values(query).forEach(value => {
      if (typeof value === 'string') {
        this.checkForSecurityThreats(value, 'query parameter');
      }
    });
  }

  private validateRequestBody(req: Request): void {
    const body = req.body;

    if (!body || typeof body !== 'object') {
      throw new BadRequestException({
        error: 'Bad Request',
        message: 'Request body must be a valid JSON object',
        statusCode: 400,
      });
    }

    // Check for security threats in body fields
    this.recursiveSecurityCheck(body, 'request body');

    // Validate specific body fields based on endpoint
    if (req.path.includes('/franchise/')) {
      this.validateFranchiseBody(body);
    } else if (req.path.includes('/store/')) {
      this.validateStoreBody(body);
    } else if (req.path.includes('/pet/')) {
      this.validatePetBody(body);
    } else if (req.path.includes('/order/')) {
      this.validateOrderBody(body);
    }
  }

  private validateApiSpecificRules(req: Request): void {
    // Store-specific validations
    if (req.path.includes('/store/') && req.params.storeId) {
      // Additional store context validations could go here
    }

    // Admin-specific validations
    if (req.path.startsWith('/api/v1/admin/')) {
      // Additional admin context validations could go here
    }

    // Rate limiting headers validation
    const rateLimitHeaders = ['X-RateLimit-Limit', 'X-RateLimit-Remaining'];
    rateLimitHeaders.forEach(header => {
      const value = req.get(header);
      if (value && (isNaN(parseInt(value)) || parseInt(value) < 0)) {
        throw new BadRequestException({
          error: 'Bad Request',
          message: `Invalid ${header} header value`,
          statusCode: 400,
        });
      }
    });
  }

  private validateFranchiseBody(body: any): void {
    if (body.name && (typeof body.name !== 'string' || body.name.length > 100)) {
      throw new BadRequestException({
        error: 'Bad Request',
        message: 'Franchise name must be a string with maximum 100 characters',
        statusCode: 400,
      });
    }

    if (body.email && !this.patterns.email.test(body.email)) {
      throw new BadRequestException({
        error: 'Bad Request',
        message: 'Invalid email format',
        statusCode: 400,
      });
    }
  }

  private validateStoreBody(body: any): void {
    if (body.name && (typeof body.name !== 'string' || body.name.length > 100)) {
      throw new BadRequestException({
        error: 'Bad Request',
        message: 'Store name must be a string with maximum 100 characters',
        statusCode: 400,
      });
    }

    if (body.franchiseId && !this.patterns.franchiseId.test(body.franchiseId)) {
      throw new BadRequestException({
        error: 'Bad Request',
        message: 'Invalid franchise ID format',
        statusCode: 400,
      });
    }
  }

  private validatePetBody(body: any): void {
    if (body.name && (typeof body.name !== 'string' || body.name.length > 50)) {
      throw new BadRequestException({
        error: 'Bad Request',
        message: 'Pet name must be a string with maximum 50 characters',
        statusCode: 400,
      });
    }

    const validStatuses = ['available', 'pending', 'sold'];
    if (body.status && !validStatuses.includes(body.status)) {
      throw new BadRequestException({
        error: 'Bad Request',
        message: `Invalid pet status. Must be one of: ${validStatuses.join(', ')}`,
        statusCode: 400,
      });
    }
  }

  private validateOrderBody(body: any): void {
    if (body.quantity && (typeof body.quantity !== 'number' || body.quantity < 1 || body.quantity > 100)) {
      throw new BadRequestException({
        error: 'Bad Request',
        message: 'Order quantity must be a number between 1 and 100',
        statusCode: 400,
      });
    }

    const validStatuses = ['placed', 'approved', 'delivered', 'cancelled'];
    if (body.status && !validStatuses.includes(body.status)) {
      throw new BadRequestException({
        error: 'Bad Request',
        message: `Invalid order status. Must be one of: ${validStatuses.join(', ')}`,
        statusCode: 400,
      });
    }
  }

  private checkForSecurityThreats(value: string, context: string): void {
    // Check for SQL injection patterns
    if (this.patterns.sqlInjection.test(value)) {
      throw new BadRequestException({
        error: 'Bad Request',
        message: `Potential security threat detected in ${context}`,
        statusCode: 400,
      });
    }

    // Check for XSS patterns
    if (this.patterns.xss.test(value)) {
      throw new BadRequestException({
        error: 'Bad Request',
        message: `Potential XSS threat detected in ${context}`,
        statusCode: 400,
      });
    }

    // Check for overly long strings that might indicate attacks
    if (value.length > 1000) {
      throw new BadRequestException({
        error: 'Bad Request',
        message: `Value too long in ${context}. Maximum 1000 characters allowed.`,
        statusCode: 400,
      });
    }
  }

  private recursiveSecurityCheck(obj: any, context: string, depth: number = 0): void {
    // Prevent deep object traversal attacks
    if (depth > 10) {
      throw new BadRequestException({
        error: 'Bad Request',
        message: 'Request object too deeply nested',
        statusCode: 400,
      });
    }

    if (Array.isArray(obj)) {
      // Limit array size
      if (obj.length > 100) {
        throw new BadRequestException({
          error: 'Bad Request',
          message: `Array too large in ${context}. Maximum 100 elements allowed.`,
          statusCode: 400,
        });
      }

      obj.forEach((item, index) => {
        if (typeof item === 'string') {
          this.checkForSecurityThreats(item, `${context}[${index}]`);
        } else if (typeof item === 'object' && item !== null) {
          this.recursiveSecurityCheck(item, `${context}[${index}]`, depth + 1);
        }
      });
    } else if (typeof obj === 'object' && obj !== null) {
      // Limit object size
      const keys = Object.keys(obj);
      if (keys.length > 50) {
        throw new BadRequestException({
          error: 'Bad Request',
          message: `Object too large in ${context}. Maximum 50 properties allowed.`,
          statusCode: 400,
        });
      }

      keys.forEach(key => {
        // Check key for security threats
        this.checkForSecurityThreats(key, `${context} key`);

        const value = obj[key];
        if (typeof value === 'string') {
          this.checkForSecurityThreats(value, `${context}.${key}`);
        } else if (typeof value === 'object' && value !== null) {
          this.recursiveSecurityCheck(value, `${context}.${key}`, depth + 1);
        }
      });
    }
  }
}