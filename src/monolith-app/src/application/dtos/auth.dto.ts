/**
 * Authentication DTOs
 * 
 * Data Transfer Objects for authentication and user management operations.
 * These DTOs handle request/response data transformation and validation.
 */

import { IsEmail, IsString, IsEnum, IsOptional, MinLength, MaxLength, IsPhoneNumber, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole, UserStatus } from '../../domain/entities/user.entity';

// Login Request DTO
export class LoginDto {
  @ApiProperty({
    description: 'User email address',
    example: 'admin@petstore.com'
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'SecurePassword123!',
    minLength: 8
  })
  @IsString()
  @MinLength(8)
  password: string;
}

// Registration Request DTO
export class RegisterDto {
  @ApiProperty({
    description: 'User email address',
    example: 'newuser@petstore.com'
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'SecurePassword123!',
    minLength: 8
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John'
  })
  @IsString()
  @MaxLength(50)
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe'
  })
  @IsString()
  @MaxLength(50)
  lastName: string;

  @ApiPropertyOptional({
    description: 'User phone number',
    example: '+1-555-123-4567'
  })
  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @ApiPropertyOptional({
    description: 'User address',
    example: '123 Main St, Anytown, USA 12345'
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: 'User role',
    enum: UserRole,
    example: UserRole.CUSTOMER
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'Associated store ID for store-level users',
    example: 'store_123'
  })
  @IsOptional()
  @IsString()
  storeId?: string;

  @ApiPropertyOptional({
    description: 'Associated franchise ID for franchise-level users',
    example: 'franchise_456'
  })
  @IsOptional()
  @IsString()
  franchiseId?: string;
}

// User Response DTO (defined first to avoid circular dependency)
export class UserResponseDto {
  @ApiProperty({
    description: 'User unique identifier',
    example: 'user_12345'
  })
  id: string;

  @ApiProperty({
    description: 'User email address',
    example: 'user@petstore.com'
  })
  email: string;

  @ApiProperty({
    description: 'User role',
    enum: UserRole,
    example: UserRole.STORE_OWNER
  })
  role: UserRole;

  @ApiProperty({
    description: 'User status',
    enum: UserStatus,
    example: UserStatus.ACTIVE
  })
  status: UserStatus;

  @ApiProperty({
    description: 'User profile information'
  })
  profile: {
    firstName: string;
    lastName: string;
    phone?: string;
    address?: string;
    dateOfBirth?: Date;
  };

  @ApiPropertyOptional({
    description: 'Associated store ID',
    example: 'store_123'
  })
  storeId?: string;

  @ApiPropertyOptional({
    description: 'Associated franchise ID',
    example: 'franchise_456'
  })
  franchiseId?: string;

  @ApiProperty({
    description: 'Account creation date',
    example: '2024-01-15T10:30:00Z'
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update date',
    example: '2024-01-20T14:45:00Z'
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Last login date',
    example: '2024-01-20T09:15:00Z'
  })
  lastLoginAt?: Date;

  @ApiPropertyOptional({
    description: 'Email verification date',
    example: '2024-01-15T11:00:00Z'
  })
  emailVerifiedAt?: Date;
}

// Authentication Response DTO
export class AuthResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  })
  accessToken: string;

  @ApiProperty({
    description: 'JWT refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  })
  refreshToken: string;

  @ApiProperty({
    description: 'Token expiration time in seconds',
    example: 3600
  })
  expiresIn: number;

  @ApiProperty({
    description: 'Token type',
    example: 'Bearer'
  })
  tokenType: string;

  @ApiProperty({
    description: 'User information',
    type: UserResponseDto
  })
  user: UserResponseDto;
}

// Refresh Token Request DTO
export class RefreshTokenDto {
  @ApiProperty({
    description: 'JWT refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  })
  @IsString()
  refreshToken: string;
}

// Change Password Request DTO
export class ChangePasswordDto {
  @ApiProperty({
    description: 'Current password',
    example: 'OldPassword123!'
  })
  @IsString()
  @MinLength(8)
  currentPassword: string;

  @ApiProperty({
    description: 'New password',
    example: 'NewSecurePassword456!',
    minLength: 8
  })
  @IsString()
  @MinLength(8)
  newPassword: string;
}

// Update Profile Request DTO
export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: 'User first name',
    example: 'John'
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  firstName?: string;

  @ApiPropertyOptional({
    description: 'User last name',
    example: 'Doe'
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  lastName?: string;

  @ApiPropertyOptional({
    description: 'User phone number',
    example: '+1-555-123-4567'
  })
  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @ApiPropertyOptional({
    description: 'User address',
    example: '123 Main St, Anytown, USA 12345'
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: 'Date of birth',
    example: '1990-01-15'
  })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: Date;
}

// API Key Validation Response DTO
export class ApiKeyValidationDto {
  @ApiProperty({
    description: 'Whether the API key is valid',
    example: true
  })
  valid: boolean;

  @ApiPropertyOptional({
    description: 'API key metadata',
    example: {
      keyId: 'key_12345',
      permissions: ['read', 'write'],
      expiresAt: '2024-12-31T23:59:59Z'
    }
  })
  metadata?: {
    keyId: string;
    permissions: string[];
    expiresAt?: Date;
  };
}