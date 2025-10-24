/**
 * Franchise Data Transfer Objects
 * 
 * DTOs for franchise-related API operations.
 * These objects handle serialization/deserialization and validation
 * for franchise endpoints following the OpenAPI specification.
 */

import { IsString, IsOptional, IsArray, IsNotEmpty, Matches } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for creating a new franchise
 * Maps to FranchiseInput schema in OpenAPI spec
 */
export class CreateFranchiseDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^franchise-\d+$/, {
    message: 'Franchise ID must follow format: franchise-{number}',
  })
  id: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  stores?: string[];
}

/**
 * DTO for updating an existing franchise
 * Similar to CreateFranchiseDto but all fields are optional except ID
 */
export class UpdateFranchiseDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^franchise-\d+$/, {
    message: 'Franchise ID must follow format: franchise-{number}',
  })
  id: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  stores?: string[];
}

/**
 * DTO for franchise response
 * Maps to Franchise schema in OpenAPI spec
 */
export class FranchiseResponseDto {
  id: string;
  name: string;
  location?: string;
  stores: string[];
  createdAt: string;
  updatedAt: string;

  constructor(data: {
    id: string;
    name: string;
    location?: string;
    stores: string[];
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = data.id;
    this.name = data.name;
    this.location = data.location;
    this.stores = data.stores;
    this.createdAt = data.createdAt.toISOString();
    this.updatedAt = data.updatedAt.toISOString();
  }
}

/**
 * DTO for successful operation response
 * Maps to SuccessResponse schema in OpenAPI spec
 */
export class FranchiseSuccessResponseDto {
  success: string;
  url: string;
  data: Record<string, any>;

  constructor(message: string, url: string, data: Record<string, any> = {}) {
    this.success = message;
    this.url = url;
    this.data = data;
  }
}

/**
 * DTO for delete operation response
 * Maps to DeleteResponse schema in OpenAPI spec
 */
export class FranchiseDeleteResponseDto {
  url: string;
  data: Record<string, any>;

  constructor(url: string, data: Record<string, any> = {}) {
    this.url = url;
    this.data = data;
  }
}