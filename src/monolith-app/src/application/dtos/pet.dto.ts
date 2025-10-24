/**
 * Pet Data Transfer Objects
 * 
 * DTOs for pet-related API operations.
 * These objects handle serialization/deserialization and validation
 * for pet endpoints following the OpenAPI specification.
 */

import { IsString, IsOptional, IsNotEmpty, IsNumber, IsPositive, IsIn, Min } from 'class-validator';
import { PetStatus, PetSpecies } from '../../domain/entities/pet.entity';

/**
 * DTO for creating a new pet
 * Maps to PetInput schema in OpenAPI spec
 */
export class CreatePetDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsIn(['Dog', 'Cat', 'Bird', 'Fish', 'Rabbit', 'Other'])
  species: PetSpecies;

  @IsOptional()
  @IsString()
  breed?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  age?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  @IsIn(['available', 'pending', 'sold'])
  status?: PetStatus;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  @IsIn(['small', 'medium', 'large'])
  size?: 'small' | 'medium' | 'large';

  @IsOptional()
  @IsNumber()
  @IsPositive()
  weight?: number;

  @IsOptional()
  @IsString()
  healthStatus?: string;
}

/**
 * DTO for updating an existing pet
 * Similar to CreatePetDto but all fields are optional
 */
export class UpdatePetDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  breed?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  age?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  @IsIn(['available', 'pending', 'sold'])
  status?: PetStatus;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  @IsIn(['small', 'medium', 'large'])
  size?: 'small' | 'medium' | 'large';

  @IsOptional()
  @IsNumber()
  @IsPositive()
  weight?: number;

  @IsOptional()
  @IsString()
  healthStatus?: string;
}

/**
 * DTO for pet response
 * Maps to Pet schema in OpenAPI spec
 */
export class PetResponseDto {
  id: string;
  name: string;
  species: PetSpecies;
  breed?: string;
  age?: number;
  price?: number;
  status: PetStatus;
  storeId: string;
  description?: string;
  healthStatus?: string;
  vaccination?: boolean;
  neutered?: boolean;
  color?: string;
  size?: 'small' | 'medium' | 'large';
  weight?: number;
  createdAt: string;
  updatedAt: string;

  constructor(data: {
    id: string;
    name: string;
    species: PetSpecies;
    breed?: string;
    age?: number;
    price?: number;
    status: PetStatus;
    storeId: string;
    description?: string;
    healthStatus?: string;
    vaccination?: boolean;
    neutered?: boolean;
    color?: string;
    size?: 'small' | 'medium' | 'large';
    weight?: number;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = data.id;
    this.name = data.name;
    this.species = data.species;
    this.breed = data.breed;
    this.age = data.age;
    this.price = data.price;
    this.status = data.status;
    this.storeId = data.storeId;
    this.description = data.description;
    this.healthStatus = data.healthStatus;
    this.vaccination = data.vaccination;
    this.neutered = data.neutered;
    this.color = data.color;
    this.size = data.size;
    this.weight = data.weight;
    this.createdAt = data.createdAt.toISOString();
    this.updatedAt = data.updatedAt.toISOString();
  }
}

/**
 * DTO for pet search filters
 * Used for filtering pets in search operations
 */
export class PetSearchFiltersDto {
  @IsOptional()
  @IsString()
  @IsIn(['available', 'pending', 'sold'])
  status?: PetStatus;

  @IsOptional()
  @IsString()
  @IsIn(['Dog', 'Cat', 'Bird', 'Fish', 'Rabbit', 'Other'])
  species?: PetSpecies;

  @IsOptional()
  @IsString()
  breed?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minAge?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxAge?: number;

  @IsOptional()
  @IsString()
  @IsIn(['small', 'medium', 'large'])
  size?: 'small' | 'medium' | 'large';
}