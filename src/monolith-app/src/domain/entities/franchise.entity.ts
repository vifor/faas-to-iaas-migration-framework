/**
 * Franchise Domain Entity
 * 
 * Represents a business franchise with associated stores.
 * Maps to the 'petstoreFranchise' DynamoDB table with simple partition key structure.
 * 
 * Business Rules:
 * - Each franchise must have a unique identifier
 * - Franchise name is required for business identification
 * - Location is optional but recommended for geographic identification
 * - Stores are associated via store IDs array
 * - Timestamps track creation and modification history
 */

export class Franchise {
  /**
   * Unique franchise identifier (DynamoDB partition key)
   * Format: franchise-{number} (e.g., "franchise-001")
   */
  public readonly id: string;

  /**
   * Franchise business name
   * Required for business identification and display
   */
  public name: string;

  /**
   * Franchise primary location or address
   * Optional field for geographic identification
   */
  public location?: string;

  /**
   * Array of store IDs associated with this franchise
   * Maintains relationships to Store entities
   */
  public stores: string[];

  /**
   * Creation timestamp
   * Automatically set when franchise is created
   */
  public readonly createdAt: Date;

  /**
   * Last update timestamp
   * Updated whenever franchise information changes
   */
  public updatedAt: Date;

  constructor(
    id: string,
    name: string,
    location?: string,
    stores: string[] = [],
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    this.id = id;
    this.name = name;
    this.location = location;
    this.stores = stores;
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
  }

  /**
   * Add a store to this franchise
   * Maintains referential relationship
   */
  public addStore(storeId: string): void {
    if (!this.stores.includes(storeId)) {
      this.stores.push(storeId);
      this.updatedAt = new Date();
    }
  }

  /**
   * Remove a store from this franchise
   * Maintains referential relationship
   */
  public removeStore(storeId: string): void {
    const index = this.stores.indexOf(storeId);
    if (index > -1) {
      this.stores.splice(index, 1);
      this.updatedAt = new Date();
    }
  }

  /**
   * Update franchise information
   * Updates modification timestamp
   */
  public updateInformation(name?: string, location?: string): void {
    if (name !== undefined) {
      this.name = name;
    }
    if (location !== undefined) {
      this.location = location;
    }
    this.updatedAt = new Date();
  }

  /**
   * Check if franchise has any stores
   */
  public hasStores(): boolean {
    return this.stores.length > 0;
  }

  /**
   * Get number of associated stores
   */
  public getStoreCount(): number {
    return this.stores.length;
  }

  /**
   * Validate franchise data
   * Ensures business rules are met
   */
  public validate(): string[] {
    const errors: string[] = [];

    if (!this.id || this.id.trim() === '') {
      errors.push('Franchise ID is required');
    }

    if (!this.name || this.name.trim() === '') {
      errors.push('Franchise name is required');
    }

    if (this.id && !this.id.match(/^franchise-\d+$/)) {
      errors.push('Franchise ID must follow format: franchise-{number}');
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
      name: this.name,
      location: this.location,
      stores: this.stores,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }

  /**
   * Create franchise from plain object
   * Used for database deserialization
   */
  public static fromPlainObject(data: Record<string, any>): Franchise {
    return new Franchise(
      data.id,
      data.name,
      data.location,
      data.stores || [],
      data.createdAt ? new Date(data.createdAt) : undefined,
      data.updatedAt ? new Date(data.updatedAt) : undefined,
    );
  }

  /**
   * Create a new franchise with generated ID
   * Utility method for franchise creation
   */
  public static create(
    name: string,
    location?: string,
    stores: string[] = [],
  ): Franchise {
    // Generate franchise ID (in real implementation, this might come from a service)
    const timestamp = Date.now();
    const id = `franchise-${timestamp}`;
    
    return new Franchise(id, name, location, stores);
  }
}