/**
 * Common Data Transfer Objects
 * 
 * DTOs for common API responses like authorization, errors, and success messages.
 * These map to the common schemas in the OpenAPI specification.
 */

import { IsString, IsNumber, IsArray, IsOptional, IsIn } from 'class-validator';

/**
 * DTO for authorized response from store operations
 * Maps to AuthorizedResponse schema in OpenAPI spec
 */
export class AuthorizedResponseDto {
  @IsString()
  @IsIn(['ALLOW', 'DENY'])
  decision: 'ALLOW' | 'DENY';

  @IsString()
  message: string;

  @IsNumber()
  statusCode: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  determiningPolicies?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  errors?: string[];

  constructor(
    decision: 'ALLOW' | 'DENY',
    message: string,
    statusCode: number,
    determiningPolicies?: string[],
    errors?: string[],
  ) {
    this.decision = decision;
    this.message = message;
    this.statusCode = statusCode;
    this.determiningPolicies = determiningPolicies;
    this.errors = errors;
  }
}

/**
 * DTO for error response
 * Maps to ErrorResponse schema in OpenAPI spec
 */
export class ErrorResponseDto {
  @IsString()
  error: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsNumber()
  statusCode: number;

  @IsOptional()
  body?: any;

  constructor(error: string, statusCode: number, url?: string, body?: any) {
    this.error = error;
    this.statusCode = statusCode;
    this.url = url;
    this.body = body;
  }
}

/**
 * DTO for successful operation response
 * Maps to SuccessResponse schema in OpenAPI spec
 */
export class SuccessResponseDto {
  @IsString()
  success: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  data?: Record<string, any>;

  constructor(success: string, url?: string, data?: Record<string, any>) {
    this.success = success;
    this.url = url;
    this.data = data || {};
  }
}

/**
 * DTO for delete operation response
 * Maps to DeleteResponse schema in OpenAPI spec
 */
export class DeleteResponseDto {
  @IsString()
  url: string;

  @IsOptional()
  data?: Record<string, any>;

  constructor(url: string, data?: Record<string, any>) {
    this.url = url;
    this.data = data || {};
  }
}

/**
 * DTO for pagination metadata
 */
export class PaginationMetaDto {
  @IsNumber()
  page: number;

  @IsNumber()
  limit: number;

  @IsNumber()
  total: number;

  @IsNumber()
  totalPages: number;

  @IsOptional()
  hasNext?: boolean;

  @IsOptional()
  hasPrev?: boolean;

  constructor(page: number, limit: number, total: number) {
    this.page = page;
    this.limit = limit;
    this.total = total;
    this.totalPages = Math.ceil(total / limit);
    this.hasNext = page < this.totalPages;
    this.hasPrev = page > 1;
  }
}

/**
 * DTO for paginated response
 */
export class PaginatedResponseDto<T> {
  data: T[];
  meta: PaginationMetaDto;

  constructor(data: T[], meta: PaginationMetaDto) {
    this.data = data;
    this.meta = meta;
  }
}

/**
 * DTO for health check response
 */
export class HealthCheckResponseDto {
  @IsString()
  status: string;

  @IsString()
  timestamp: string;

  @IsOptional()
  @IsNumber()
  uptime?: number;

  @IsOptional()
  @IsString()
  environment?: string;

  @IsOptional()
  @IsString()
  service?: string;

  @IsOptional()
  @IsString()
  version?: string;

  constructor(data: {
    status: string;
    timestamp: Date;
    uptime?: number;
    environment?: string;
    service?: string;
    version?: string;
  }) {
    this.status = data.status;
    this.timestamp = data.timestamp.toISOString();
    this.uptime = data.uptime;
    this.environment = data.environment;
    this.service = data.service;
    this.version = data.version;
  }
}