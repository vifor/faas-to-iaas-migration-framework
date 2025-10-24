/**
 * Store Domain Entity
 * 
 * Represents a physical store location belonging to a franchise.
 * Maps to the 'petstoreTenants' DynamoDB table with composite key structure (id + value).
 * 
 * Business Rules:
 * - Each store must have a unique composite identifier (id + value)
 * - Store ID (partition key) groups related store records
 * - Store value (sort key) differentiates store types or branches
 * - Store must belong to a franchise
 * - Display name is required for identification
 * - Physical address is optional but recommended
 */

import { Franchise } from './franchise.entity';

export type StoreStatus = 'active' | 'inactive' | 'maintenance';

export class Store {
  /**
   * Store identifier (DynamoDB partition key)
   * Groups related store records
   * Format: store-{number} (e.g., "store-001")
   */
  public readonly id: string;

  /**
   * Store value/type identifier (DynamoDB sort key)
   * Differentiates store types within the same ID group
   * Examples: "main", "branch", "outlet"
   */
  public readonly value: string;

  /**
   * Store display name
   * Required for business identification
   */
  public name: string;

  /**
   * Store physical address
   * Optional but recommended for location services
   */
  public address?: string;

  /**
   * Franchise this store belongs to
   * Maintains business relationship
   */
  public franchise?: Franchise;

  /**
   * Franchise ID reference
   * Used for database relationships
   */
  public franchiseId?: string;

  /**
   * Store operational status
   * Tracks store availability
   */
  public status: StoreStatus;

  /**
   * Store contact information
   */
  public phone?: string;
  public email?: string;

  /**
   * Store operating hours
   */
  public openingHours?: string;

  /**
   * Creation timestamp
   * Automatically set when store is created
   */
  public readonly createdAt: Date;

  /**
   * Last update timestamp
   * Updated whenever store information changes
   */
  public updatedAt: Date;

  constructor(
    id: string,
    value: string,
    name: string,
    address?: string,
    franchiseId?: string,
    status: StoreStatus = 'active',
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    this.id = id;
    this.value = value;
    this.name = name;
    this.address = address;
    this.franchiseId = franchiseId;
    this.status = status;
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
  }

  /**
   * Get composite key for DynamoDB operations
   * Combines partition key (id) and sort key (value)
   */
  public getCompositeKey(): { id: string; value: string } {
    return {
      id: this.id,
      value: this.value,
    };
  }

  /**
   * Get unique store identifier string
   * Format: {id}#{value}
   */
  public getUniqueId(): string {
    return `${this.id}#${this.value}`;
  }

  /**
   * Set franchise relationship
   * Updates both franchise reference and ID
   */
  public setFranchise(franchise: Franchise): void {
    this.franchise = franchise;
    this.franchiseId = franchise.id;
    this.updatedAt = new Date();
  }

  /**
   * Update store information
   * Updates modification timestamp
   */
  public updateInformation(
    name?: string,
    address?: string,
    phone?: string,
    email?: string,
    openingHours?: string,
  ): void {
    if (name !== undefined) {
      this.name = name;
    }
    if (address !== undefined) {
      this.address = address;
    }
    if (phone !== undefined) {
      this.phone = phone;
    }
    if (email !== undefined) {
      this.email = email;
    }
    if (openingHours !== undefined) {
      this.openingHours = openingHours;
    }
    this.updatedAt = new Date();
  }

  /**
   * Update store status
   * Tracks operational changes
   */
  public updateStatus(status: StoreStatus): void {
    this.status = status;
    this.updatedAt = new Date();
  }

  /**
   * Check if store is operational
   */
  public isActive(): boolean {
    return this.status === 'active';
  }

  /**
   * Check if store belongs to a franchise
   */
  public hasFranchise(): boolean {
    return !!this.franchiseId;
  }

  /**
   * Validate store data
   * Ensures business rules are met
   */
  public validate(): string[] {
    const errors: string[] = [];

    if (!this.id || this.id.trim() === '') {
      errors.push('Store ID is required');
    }

    if (!this.value || this.value.trim() === '') {
      errors.push('Store value is required');
    }

    if (!this.name || this.name.trim() === '') {
      errors.push('Store name is required');
    }

    if (this.id && !this.id.match(/^store-\d+$/)) {
      errors.push('Store ID must follow format: store-{number}');
    }

    if (this.value && this.value.includes('#')) {
      errors.push('Store value cannot contain # character');
    }

    if (this.email && !this.email.includes('@')) {
      errors.push('Invalid email format');
    }

    return errors;
  }

  /**
   * Convert to plain object for serialization
   * Used for API responses and database storage
   */
  public toPlainObject(): Record<string, any> {
    return {
      id: this.id,
      value: this.value,
      name: this.name,
      address: this.address,
      franchiseId: this.franchiseId,
      status: this.status,
      phone: this.phone,
      email: this.email,
      openingHours: this.openingHours,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      // Include franchise object if loaded
      ...(this.franchise && { franchise: this.franchise.toPlainObject() }),
    };
  }

  /**
   * Convert to DynamoDB item format
   * Excludes franchise object to avoid circular references
   */
  public toDynamoDBItem(): Record<string, any> {
    return {
      id: this.id,
      value: this.value,
      name: this.name,
      address: this.address,
      franchiseId: this.franchiseId,
      status: this.status,
      phone: this.phone,
      email: this.email,
      openingHours: this.openingHours,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }

  /**
   * Create store from plain object
   * Used for database deserialization
   */
  public static fromPlainObject(data: Record<string, any>): Store {
    const store = new Store(
      data.id,
      data.value,
      data.name,
      data.address,
      data.franchiseId,
      data.status || 'active',
      data.createdAt ? new Date(data.createdAt) : undefined,
      data.updatedAt ? new Date(data.updatedAt) : undefined,
    );

    // Set additional properties
    if (data.phone) store.phone = data.phone;
    if (data.email) store.email = data.email;
    if (data.openingHours) store.openingHours = data.openingHours;

    // Set franchise if included
    if (data.franchise) {
      store.franchise = Franchise.fromPlainObject(data.franchise);
    }

    return store;
  }

  /**
   * Create a new store with generated ID
   * Utility method for store creation
   */
  public static create(
    name: string,
    value: string,
    address?: string,
    franchiseId?: string,
  ): Store {
    // Generate store ID (in real implementation, this might come from a service)
    const timestamp = Date.now();
    const id = `store-${timestamp}`;
    
    return new Store(id, value, name, address, franchiseId);
  }

  /**
   * Parse composite key from string
   * Utility for parsing {id}#{value} format
   */
  public static parseCompositeKey(compositeKey: string): { id: string; value: string } | null {
    const parts = compositeKey.split('#');
    if (parts.length !== 2) {
      return null;
    }
    return {
      id: parts[0],
      value: parts[1],
    };
  }
}