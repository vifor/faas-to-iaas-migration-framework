/**
 * User Domain Entity
 * 
 * Represents a user in the PetStore system with authentication
 * and authorization capabilities. Users can have different roles
 * and be associated with specific stores for access control.
 */

export enum UserRole {
  ADMIN = 'admin',
  STORE_OWNER = 'store_owner', 
  STORE_EMPLOYEE = 'store_employee',
  CUSTOMER = 'customer'
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_VERIFICATION = 'pending_verification'
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  phone?: string;
  address?: string;
  dateOfBirth?: Date;
}

export class User {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly passwordHash: string,
    public readonly role: UserRole,
    public readonly status: UserStatus,
    public readonly profile: UserProfile,
    public readonly storeId?: string, // For store-level users
    public readonly franchiseId?: string, // For franchise-level users
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date(),
    public readonly lastLoginAt?: Date,
    public readonly emailVerifiedAt?: Date,
    public readonly refreshTokens: string[] = []
  ) {}

  /**
   * Check if user has admin privileges
   */
  isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }

  /**
   * Check if user can access store operations
   */
  canAccessStore(storeId: string): boolean {
    if (this.isAdmin()) return true;
    
    return this.storeId === storeId && 
           (this.role === UserRole.STORE_OWNER || this.role === UserRole.STORE_EMPLOYEE);
  }

  /**
   * Check if user can manage franchises
   */
  canManageFranchises(): boolean {
    return this.role === UserRole.ADMIN;
  }

  /**
   * Check if user can manage stores within their franchise
   */
  canManageStores(): boolean {
    return this.role === UserRole.ADMIN || this.role === UserRole.STORE_OWNER;
  }

  /**
   * Check if user account is active and verified
   */
  isActiveAndVerified(): boolean {
    return this.status === UserStatus.ACTIVE && !!this.emailVerifiedAt;
  }

  /**
   * Get display name for the user
   */
  getDisplayName(): string {
    return `${this.profile.firstName} ${this.profile.lastName}`;
  }

  /**
   * Create a new user instance with updated last login
   */
  withLastLogin(loginDate: Date = new Date()): User {
    return new User(
      this.id,
      this.email,
      this.passwordHash,
      this.role,
      this.status,
      this.profile,
      this.storeId,
      this.franchiseId,
      this.createdAt,
      new Date(), // updatedAt
      loginDate, // lastLoginAt
      this.emailVerifiedAt,
      this.refreshTokens
    );
  }

  /**
   * Create a new user instance with additional refresh token
   */
  withRefreshToken(refreshToken: string): User {
    const newRefreshTokens = [...this.refreshTokens, refreshToken];
    
    return new User(
      this.id,
      this.email,
      this.passwordHash,
      this.role,
      this.status,
      this.profile,
      this.storeId,
      this.franchiseId,
      this.createdAt,
      new Date(), // updatedAt
      this.lastLoginAt,
      this.emailVerifiedAt,
      newRefreshTokens
    );
  }

  /**
   * Create a new user instance without a specific refresh token
   */
  withoutRefreshToken(refreshToken: string): User {
    const newRefreshTokens = this.refreshTokens.filter(token => token !== refreshToken);
    
    return new User(
      this.id,
      this.email,
      this.passwordHash,
      this.role,
      this.status,
      this.profile,
      this.storeId,
      this.franchiseId,
      this.createdAt,
      new Date(), // updatedAt
      this.lastLoginAt,
      this.emailVerifiedAt,
      newRefreshTokens
    );
  }

  /**
   * Convert to plain object for serialization
   */
  toJSON() {
    return {
      id: this.id,
      email: this.email,
      role: this.role,
      status: this.status,
      profile: this.profile,
      storeId: this.storeId,
      franchiseId: this.franchiseId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      lastLoginAt: this.lastLoginAt,
      emailVerifiedAt: this.emailVerifiedAt,
      // Note: passwordHash and refreshTokens are excluded for security
    };
  }
}