/**
 * Authentication Service
 * 
 * Handles user authentication, JWT token generation/validation,
 * password management, and user session handling.
 */

import { Injectable, Logger, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

import { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { User, UserRole, UserStatus } from '../../domain/entities/user.entity';
import { 
  LoginDto, 
  RegisterDto, 
  AuthResponseDto, 
  UserResponseDto, 
  RefreshTokenDto,
  ChangePasswordDto,
  UpdateProfileDto,
  ApiKeyValidationDto
} from '../dtos/auth.dto';

export interface JwtPayload {
  sub: string; // User ID
  email: string;
  storeId?: string;
  franchiseId?: string;
  role: UserRole;
  iat: number;
  exp: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly saltRounds = 12;

  constructor(
    @Inject('USER_REPOSITORY')
    private readonly userRepository: IUserRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.logger.log('🔐 Authentication Service initialized');
  }

  /**
   * Authenticate user with email and password
   */
  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    this.logger.log(`🔑 Login attempt for user: ${loginDto.email}`);

    // Find user by email
    const user = await this.userRepository.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if user account is active
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(`Account is ${user.status.toLowerCase()}`);
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Update last login and add refresh token to user
    const updatedUser = user
      .withLastLogin()
      .withRefreshToken(tokens.refreshToken);
    
    await this.userRepository.update(updatedUser);

    this.logger.log(`✅ Successful login for user: ${loginDto.email}`);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: this.getTokenExpirationTime(),
      tokenType: 'Bearer',
      user: this.mapUserToResponse(updatedUser)
    };
  }

  /**
   * Register a new user account
   */
  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    this.logger.log(`📝 Registration attempt for user: ${registerDto.email}`);

    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(registerDto.password, this.saltRounds);

    // Create user entity
    const userId = `user_${uuidv4()}`;
    const user = new User(
      userId,
      registerDto.email,
      passwordHash,
      registerDto.role || UserRole.CUSTOMER,
      UserStatus.ACTIVE, // In production, might be PENDING_VERIFICATION
      {
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        phone: registerDto.phone
      },
      registerDto.storeId,
      registerDto.franchiseId,
      new Date(),
      new Date(),
      undefined, // lastLoginAt
      new Date() // emailVerifiedAt - in production, this would be set after email verification
    );

    // Save user to repository
    const createdUser = await this.userRepository.create(user);

    // Generate tokens
    const tokens = await this.generateTokens(createdUser);

    // Update user with refresh token
    const updatedUser = createdUser.withRefreshToken(tokens.refreshToken);
    await this.userRepository.update(updatedUser);

    this.logger.log(`✅ Successfully registered user: ${registerDto.email}`);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: this.getTokenExpirationTime(),
      tokenType: 'Bearer',
      user: this.mapUserToResponse(updatedUser)
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<AuthResponseDto> {
    try {
      // Verify refresh token
      const payload = await this.jwtService.verifyAsync(refreshTokenDto.refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      // Find user by refresh token
      const user = await this.userRepository.findByRefreshToken(refreshTokenDto.refreshToken);
      if (!user || user.id !== payload.sub) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Check if user is still active
      if (user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException('Account is not active');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      // Remove old refresh token and add new one
      const updatedUser = user
        .withoutRefreshToken(refreshTokenDto.refreshToken)
        .withRefreshToken(tokens.refreshToken);
      
      await this.userRepository.update(updatedUser);

      this.logger.log(`🔄 Token refreshed for user: ${user.email}`);

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: this.getTokenExpirationTime(),
        tokenType: 'Bearer',
        user: this.mapUserToResponse(updatedUser)
      };
    } catch (error) {
      this.logger.error('❌ Refresh token verification failed:', error);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Logout user by removing refresh token
   */
  async logout(refreshToken: string): Promise<void> {
    const user = await this.userRepository.findByRefreshToken(refreshToken);
    if (user) {
      const updatedUser = user.withoutRefreshToken(refreshToken);
      await this.userRepository.update(updatedUser);
      this.logger.log(`👋 User logged out: ${user.email}`);
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword, 
      user.passwordHash
    );
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(changePasswordDto.newPassword, this.saltRounds);

    // Create updated user with new password (need to create new user since passwordHash is readonly)
    const updatedUser = new User(
      user.id,
      user.email,
      newPasswordHash,
      user.role,
      user.status,
      user.profile,
      user.storeId,
      user.franchiseId,
      user.createdAt,
      new Date(), // updatedAt
      user.lastLoginAt,
      user.emailVerifiedAt,
      [] // Clear all refresh tokens for security
    );

    await this.userRepository.update(updatedUser);
    this.logger.log(`🔒 Password changed for user: ${user.email}`);
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Update profile
    const updatedProfile = {
      ...user.profile,
      ...(updateProfileDto.firstName && { firstName: updateProfileDto.firstName }),
      ...(updateProfileDto.lastName && { lastName: updateProfileDto.lastName }),
      ...(updateProfileDto.phone && { phone: updateProfileDto.phone }),
      ...(updateProfileDto.address && { address: updateProfileDto.address }),
      ...(updateProfileDto.dateOfBirth && { dateOfBirth: new Date(updateProfileDto.dateOfBirth) })
    };

    const updatedUser = new User(
      user.id,
      user.email,
      user.passwordHash,
      user.role,
      user.status,
      updatedProfile,
      user.storeId,
      user.franchiseId,
      user.createdAt,
      new Date(), // updatedAt
      user.lastLoginAt,
      user.emailVerifiedAt,
      user.refreshTokens
    );

    const savedUser = await this.userRepository.update(updatedUser);
    this.logger.log(`📝 Profile updated for user: ${user.email}`);

    return this.mapUserToResponse(savedUser);
  }

  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.mapUserToResponse(user);
  }

  /**
   * Validate API key
   */
  async validateApiKey(apiKey: string): Promise<ApiKeyValidationDto> {
    const validApiKeys = this.configService.get<string>('API_KEYS', '').split(',');
    const adminApiKey = this.configService.get<string>('ADMIN_API_KEY');

    if (validApiKeys.includes(apiKey) || apiKey === adminApiKey) {
      this.logger.log('✅ Valid API key used');
      return {
        valid: true,
        metadata: {
          keyId: apiKey === adminApiKey ? 'admin_master' : 'api_key',
          permissions: apiKey === adminApiKey 
            ? ['franchise:read', 'franchise:write', 'store:read', 'store:write', 'user:read', 'user:write']
            : ['franchise:read', 'store:read'],
          expiresAt: undefined // API keys don't expire in this implementation
        }
      };
    }

    this.logger.warn('❌ Invalid API key attempted');
    return {
      valid: false,
      metadata: {
        keyId: 'unknown',
        permissions: [],
        expiresAt: undefined
      }
    };
  }

  /**
   * Generate JWT access and refresh tokens
   */
  private async generateTokens(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      storeId: user.storeId,
      franchiseId: user.franchiseId,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + this.getTokenExpirationTime()
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: this.configService.get('JWT_EXPIRES_IN', '24h')
      }),
      this.jwtService.signAsync(
        { sub: user.id, type: 'refresh' }, 
        {
          secret: this.configService.get('JWT_REFRESH_SECRET'),
          expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d')
        }
      )
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * Get token expiration time in seconds
   */
  private getTokenExpirationTime(): number {
    const expiresIn = this.configService.get('JWT_EXPIRES_IN', '24h');
    // Convert various time formats to seconds
    if (expiresIn.endsWith('h')) {
      return parseInt(expiresIn) * 3600;
    } else if (expiresIn.endsWith('m')) {
      return parseInt(expiresIn) * 60;
    } else if (expiresIn.endsWith('d')) {
      return parseInt(expiresIn) * 24 * 3600;
    } else {
      return parseInt(expiresIn);
    }
  }

  /**
   * Map User entity to UserResponseDto
   */
  private mapUserToResponse(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      profile: user.profile,
      storeId: user.storeId,
      franchiseId: user.franchiseId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
      emailVerifiedAt: user.emailVerifiedAt
    };
  }
}