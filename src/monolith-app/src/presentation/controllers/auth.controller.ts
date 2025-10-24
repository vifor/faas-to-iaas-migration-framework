/**
 * Authentication Controller
 * 
 * Handles user authentication endpoints including login, registration,
 * profile management, and token operations. Provides public endpoints
 * for authentication and protected endpoints for user management.
 */

import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Request,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiOkResponse,
} from '@nestjs/swagger';

import { AuthService } from '../../application/services/auth.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import {
  LoginDto,
  RegisterDto,
  AuthResponseDto,
  UserResponseDto,
  RefreshTokenDto,
  ChangePasswordDto,
  UpdateProfileDto,
} from '../../application/dtos/auth.dto';

// Error response schemas
class AuthErrorResponse {
  error: string;
  message: string;
  statusCode: number;
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {
    this.logger.log('🔐 Authentication Controller initialized');
  }

  /**
   * User login with email and password
   * POST /api/v1/auth/login
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User login',
    description: 'Authenticate user with email and password, returns JWT tokens',
  })
  @ApiBody({
    type: LoginDto,
    description: 'User credentials',
    examples: {
      storeOwner: {
        summary: 'Store Owner Login',
        description: 'Login as a store owner',
        value: {
          email: 'owner@store1.petstore.com',
          password: 'SecurePassword123!'
        }
      },
      admin: {
        summary: 'Admin Login',
        description: 'Login as an administrator',
        value: {
          email: 'admin@petstore.com',
          password: 'AdminPassword123!'
        }
      }
    }
  })
  @ApiOkResponse({
    description: 'Login successful',
    type: AuthResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials or inactive account',
    type: AuthErrorResponse,
  })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    this.logger.log(`🔑 Login attempt for: ${loginDto.email}`);
    return this.authService.login(loginDto);
  }

  /**
   * User registration
   * POST /api/v1/auth/register
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'User registration',
    description: 'Register a new user account, returns JWT tokens',
  })
  @ApiBody({
    type: RegisterDto,
    description: 'User registration information',
    examples: {
      customer: {
        summary: 'Customer Registration',
        description: 'Register as a customer',
        value: {
          email: 'customer@example.com',
          password: 'SecurePassword123!',
          firstName: 'John',
          lastName: 'Doe',
          phone: '+1-555-123-4567'
        }
      },
      storeEmployee: {
        summary: 'Store Employee Registration',
        description: 'Register as a store employee',
        value: {
          email: 'employee@store1.petstore.com',
          password: 'SecurePassword123!',
          firstName: 'Jane',
          lastName: 'Smith',
          phone: '+1-555-987-6543',
          role: 'store_employee',
          storeId: 'store_12345'
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Registration successful',
    type: AuthResponseDto,
  })
  @ApiConflictResponse({
    description: 'Email already exists',
    type: AuthErrorResponse,
  })
  @ApiBadRequestResponse({
    description: 'Invalid registration data',
    type: AuthErrorResponse,
  })
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    this.logger.log(`📝 Registration attempt for: ${registerDto.email}`);
    return this.authService.register(registerDto);
  }

  /**
   * Refresh access token
   * POST /api/v1/auth/refresh
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Generate new access token using refresh token',
  })
  @ApiBody({
    type: RefreshTokenDto,
    description: 'Refresh token',
    examples: {
      refreshToken: {
        summary: 'Refresh Token',
        description: 'Use refresh token to get new access token',
        value: {
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
        }
      }
    }
  })
  @ApiOkResponse({
    description: 'Token refresh successful',
    type: AuthResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired refresh token',
    type: AuthErrorResponse,
  })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto): Promise<AuthResponseDto> {
    this.logger.log('🔄 Token refresh attempt');
    return this.authService.refreshToken(refreshTokenDto);
  }

  /**
   * User logout
   * POST /api/v1/auth/logout
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('BearerAuth')
  @ApiOperation({
    summary: 'User logout',
    description: 'Logout user and invalidate refresh token',
  })
  @ApiBody({
    type: RefreshTokenDto,
    description: 'Refresh token to invalidate',
  })
  @ApiOkResponse({
    description: 'Logout successful',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Logout successful' }
      }
    }
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing token',
    type: AuthErrorResponse,
  })
  async logout(@Body() refreshTokenDto: RefreshTokenDto): Promise<{ message: string }> {
    this.logger.log('👋 Logout attempt');
    await this.authService.logout(refreshTokenDto.refreshToken);
    return { message: 'Logout successful' };
  }

  /**
   * Get current user profile
   * GET /api/v1/auth/profile
   */
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('BearerAuth')
  @ApiOperation({
    summary: 'Get user profile',
    description: 'Get current authenticated user profile information',
  })
  @ApiOkResponse({
    description: 'User profile retrieved successfully',
    type: UserResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing token',
    type: AuthErrorResponse,
  })
  async getProfile(@Request() req: any): Promise<UserResponseDto> {
    const userId = req.user.id;
    this.logger.log(`👤 Profile request for user: ${userId}`);
    return this.authService.getUserProfile(userId);
  }

  /**
   * Update user profile
   * PUT /api/v1/auth/profile
   */
  @Put('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('BearerAuth')
  @ApiOperation({
    summary: 'Update user profile',
    description: 'Update current authenticated user profile information',
  })
  @ApiBody({
    type: UpdateProfileDto,
    description: 'Profile update information',
    examples: {
      updateProfile: {
        summary: 'Update Profile',
        description: 'Update user profile information',
        value: {
          firstName: 'John',
          lastName: 'Doe',
          phone: '+1-555-123-4567',
          address: '123 Main St, City, State 12345'
        }
      }
    }
  })
  @ApiOkResponse({
    description: 'Profile updated successfully',
    type: UserResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or missing token',
    type: AuthErrorResponse,
  })
  @ApiBadRequestResponse({
    description: 'Invalid profile data',
    type: AuthErrorResponse,
  })
  async updateProfile(
    @Request() req: any,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    const userId = req.user.id;
    this.logger.log(`📝 Profile update for user: ${userId}`);
    return this.authService.updateProfile(userId, updateProfileDto);
  }

  /**
   * Change user password
   * PUT /api/v1/auth/password
   */
  @Put('password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('BearerAuth')
  @ApiOperation({
    summary: 'Change password',
    description: 'Change current authenticated user password',
  })
  @ApiBody({
    type: ChangePasswordDto,
    description: 'Password change information',
    examples: {
      changePassword: {
        summary: 'Change Password',
        description: 'Change user password',
        value: {
          currentPassword: 'OldPassword123!',
          newPassword: 'NewSecurePassword456!'
        }
      }
    }
  })
  @ApiOkResponse({
    description: 'Password changed successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Password changed successfully' }
      }
    }
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid current password or missing token',
    type: AuthErrorResponse,
  })
  @ApiBadRequestResponse({
    description: 'Invalid password format',
    type: AuthErrorResponse,
  })
  async changePassword(
    @Request() req: any,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const userId = req.user.id;
    this.logger.log(`🔒 Password change for user: ${userId}`);
    await this.authService.changePassword(userId, changePasswordDto);
    return { message: 'Password changed successfully' };
  }

  /**
   * Validate current token (health check for authentication)
   * GET /api/v1/auth/validate
   */
  @Get('validate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('BearerAuth')
  @ApiOperation({
    summary: 'Validate token',
    description: 'Validate current authentication token and return user info',
  })
  @ApiOkResponse({
    description: 'Token is valid',
    schema: {
      type: 'object',
      properties: {
        valid: { type: 'boolean', example: true },
        user: { $ref: '#/components/schemas/UserResponseDto' }
      }
    }
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired token',
    type: AuthErrorResponse,
  })
  async validateToken(@Request() req: any): Promise<{ valid: boolean; user: UserResponseDto }> {
    const userId = req.user.id;
    const userProfile = await this.authService.getUserProfile(userId);
    
    this.logger.log(`✅ Token validation successful for user: ${userId}`);
    return {
      valid: true,
      user: userProfile
    };
  }
}