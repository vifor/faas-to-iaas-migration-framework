/**
 * Store Data Transfer Objects
 * 
 * DTOs for store-related API operations.
 * These objects handle serialization/deserialization and validation
 * for store endpoints with composite key support following the OpenAPI specification.
 */

import { IsString, IsOptional, IsNotEmpty, IsEmail, Matches, IsIn } from 'class-validator';
import { StoreStatus } from '../../domain/entities/store.entity';

/**
 * DTO for creating a new store
 * Maps to StoreInput schema in OpenAPI spec
 */
export class CreateStoreDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^store-\d+$/, {
    message: 'Store ID must follow format: store-{number}',
  })
  id: string;

  @IsString()
  @IsNotEmpty()
  value: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  franchiseId?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  openingHours?: string;
}

/**
 * DTO for updating an existing store
 * Similar to CreateStoreDto but composite key fields are required, others optional
 */
export class UpdateStoreDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^store-\d+$/, {
    message: 'Store ID must follow format: store-{number}',
  })
  id: string;

  @IsString()
  @IsNotEmpty()
  value: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  franchiseId?: string;

  @IsOptional()
  @IsIn(['active', 'inactive', 'maintenance'])
  status?: StoreStatus;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  openingHours?: string;
}

/**
 * DTO for store response
 * Maps to Store schema in OpenAPI spec
 */
export class StoreResponseDto {
  id: string;
  value: string;
  name: string;
  address?: string;
  franchiseId?: string;
  status: StoreStatus;
  phone?: string;
  email?: string;
  openingHours?: string;
  createdAt: string;
  updatedAt: string;
  franchise?: any; // Include franchise data if loaded

  constructor(data: {
    id: string;
    value: string;
    name: string;
    address?: string;
    franchiseId?: string;
    status: StoreStatus;
    phone?: string;
    email?: string;
    openingHours?: string;
    createdAt: Date;
    updatedAt: Date;
    franchise?: any;
  }) {
    this.id = data.id;
    this.value = data.value;
    this.name = data.name;
    this.address = data.address;
    this.franchiseId = data.franchiseId;
    this.status = data.status;
    this.phone = data.phone;
    this.email = data.email;
    this.openingHours = data.openingHours;
    this.createdAt = data.createdAt.toISOString();
    this.updatedAt = data.updatedAt.toISOString();
    
    if (data.franchise) {
      this.franchise = data.franchise;
    }
  }
}

/**
 * DTO for successful store operation response
 * Maps to SuccessResponse schema in OpenAPI spec
 */
export class StoreSuccessResponseDto {
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
 * DTO for store delete operation response
 * Maps to DeleteResponse schema in OpenAPI spec
 */
export class StoreDeleteResponseDto {
  url: string;
  data: Record<string, any>;

  constructor(url: string, data: Record<string, any> = {}) {
    this.url = url;
    this.data = data;
  }
}

/**
 * DTO for store composite key parameters
 * Used for path parameters in store operations
 */
export class StoreCompositeKeyDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^store-\d+$/, {
    message: 'Store ID must follow format: store-{number}',
  })
  id: string;

  @IsString()
  @IsNotEmpty()
  value: string;
}