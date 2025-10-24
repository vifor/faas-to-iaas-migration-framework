/**
 * Pet Domain Entity
 * 
 * Represents an animal available for adoption/purchase in a store.
 * Business entity for pet management within store operations.
 * 
 * Business Rules:
 * - Each pet must have a unique identifier within the system
 * - Pet must have a name and species for identification
 * - Age is tracked in months for consistency
 * - Price must be non-negative
 * - Status tracks availability (available, pending, sold)
 * - Pet must be associated with a store
 * - Breed is optional but recommended for detailed information
 */

export type PetStatus = 'available' | 'pending' | 'sold';
export type PetSpecies = 'Dog' | 'Cat' | 'Bird' | 'Fish' | 'Rabbit' | 'Other';

export class Pet {
  /**
   * Unique pet identifier
   * Format: pet-{number} (e.g., "pet-001")
   */
  public readonly id: string;

  /**
   * Pet name
   * Required for identification and customer interaction
   */
  public name: string;

  /**
   * Pet species
   * Required for categorization
   */
  public species: PetSpecies;

  /**
   * Pet breed
   * Optional but recommended for detailed information
   */
  public breed?: string;

  /**
   * Pet age in months
   * Standardized age representation
   */
  public age?: number;

  /**
   * Pet price in USD
   * Must be non-negative
   */
  public price?: number;

  /**
   * Pet availability status
   * Tracks adoption/purchase process
   */
  public status: PetStatus;

  /**
   * Store where pet is located
   * Required for store operations
   */
  public storeId: string;

  /**
   * Pet description
   * Optional detailed information
   */
  public description?: string;

  /**
   * Pet health information
   */
  public healthStatus?: string;
  public vaccination?: boolean;
  public neutered?: boolean;

  /**
   * Pet physical characteristics
   */
  public color?: string;
  public size?: 'small' | 'medium' | 'large';
  public weight?: number; // in kilograms

  /**
   * Creation timestamp
   * When pet was added to the system
   */
  public readonly createdAt: Date;

  /**
   * Last update timestamp
   * Updated when pet information changes
   */
  public updatedAt: Date;

  constructor(
    id: string,
    name: string,
    species: PetSpecies,
    storeId: string,
    breed?: string,
    age?: number,
    price?: number,
    status: PetStatus = 'available',
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    this.id = id;
    this.name = name;
    this.species = species;
    this.storeId = storeId;
    this.breed = breed;
    this.age = age;
    this.price = price;
    this.status = status;
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
  }

  /**
   * Update pet information
   * Updates modification timestamp
   */
  public updateInformation(
    name?: string,
    breed?: string,
    age?: number,
    price?: number,
    description?: string,
  ): void {
    if (name !== undefined) {
      this.name = name;
    }
    if (breed !== undefined) {
      this.breed = breed;
    }
    if (age !== undefined) {
      this.age = age;
    }
    if (price !== undefined) {
      this.price = price;
    }
    if (description !== undefined) {
      this.description = description;
    }
    this.updatedAt = new Date();
  }

  /**
   * Update pet health information
   */
  public updateHealthInfo(
    healthStatus?: string,
    vaccination?: boolean,
    neutered?: boolean,
  ): void {
    if (healthStatus !== undefined) {
      this.healthStatus = healthStatus;
    }
    if (vaccination !== undefined) {
      this.vaccination = vaccination;
    }
    if (neutered !== undefined) {
      this.neutered = neutered;
    }
    this.updatedAt = new Date();
  }

  /**
   * Update pet physical characteristics
   */
  public updatePhysicalInfo(
    color?: string,
    size?: 'small' | 'medium' | 'large',
    weight?: number,
  ): void {
    if (color !== undefined) {
      this.color = color;
    }
    if (size !== undefined) {
      this.size = size;
    }
    if (weight !== undefined) {
      this.weight = weight;
    }
    this.updatedAt = new Date();
  }

  /**
   * Update pet status
   * Tracks availability changes
   */
  public updateStatus(status: PetStatus): void {
    this.status = status;
    this.updatedAt = new Date();
  }

  /**
   * Mark pet as pending (reserved)
   */
  public markAsPending(): void {
    if (this.status === 'available') {
      this.updateStatus('pending');
    }
  }

  /**
   * Mark pet as sold
   */
  public markAsSold(): void {
    if (this.status === 'pending' || this.status === 'available') {
      this.updateStatus('sold');
    }
  }

  /**
   * Return pet to available status
   */
  public markAsAvailable(): void {
    if (this.status === 'pending') {
      this.updateStatus('available');
    }
  }

  /**
   * Check if pet is available for purchase
   */
  public isAvailable(): boolean {
    return this.status === 'available';
  }

  /**
   * Check if pet is pending purchase
   */
  public isPending(): boolean {
    return this.status === 'pending';
  }

  /**
   * Check if pet has been sold
   */
  public isSold(): boolean {
    return this.status === 'sold';
  }

  /**
   * Get pet age in years
   */
  public getAgeInYears(): number | undefined {
    return this.age ? Math.floor(this.age / 12) : undefined;
  }

  /**
   * Check if pet is young (less than 1 year)
   */
  public isYoung(): boolean {
    return this.age ? this.age < 12 : false;
  }

  /**
   * Validate pet data
   * Ensures business rules are met
   */
  public validate(): string[] {
    const errors: string[] = [];

    if (!this.id || this.id.trim() === '') {
      errors.push('Pet ID is required');
    }

    if (!this.name || this.name.trim() === '') {
      errors.push('Pet name is required');
    }

    if (!this.species) {
      errors.push('Pet species is required');
    }

    if (!this.storeId || this.storeId.trim() === '') {
      errors.push('Store ID is required');
    }

    if (this.age !== undefined && this.age < 0) {
      errors.push('Pet age must be non-negative');
    }

    if (this.price !== undefined && this.price < 0) {
      errors.push('Pet price must be non-negative');
    }

    if (this.weight !== undefined && this.weight <= 0) {
      errors.push('Pet weight must be positive');
    }

    if (this.id && !this.id.match(/^pet-\d+$/)) {
      errors.push('Pet ID must follow format: pet-{number}');
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
      species: this.species,
      breed: this.breed,
      age: this.age,
      price: this.price,
      status: this.status,
      storeId: this.storeId,
      description: this.description,
      healthStatus: this.healthStatus,
      vaccination: this.vaccination,
      neutered: this.neutered,
      color: this.color,
      size: this.size,
      weight: this.weight,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }

  /**
   * Create pet from plain object
   * Used for database deserialization
   */
  public static fromPlainObject(data: Record<string, any>): Pet {
    const pet = new Pet(
      data.id,
      data.name,
      data.species,
      data.storeId,
      data.breed,
      data.age,
      data.price,
      data.status || 'available',
      data.createdAt ? new Date(data.createdAt) : undefined,
      data.updatedAt ? new Date(data.updatedAt) : undefined,
    );

    // Set additional properties
    if (data.description !== undefined) pet.description = data.description;
    if (data.healthStatus !== undefined) pet.healthStatus = data.healthStatus;
    if (data.vaccination !== undefined) pet.vaccination = data.vaccination;
    if (data.neutered !== undefined) pet.neutered = data.neutered;
    if (data.color !== undefined) pet.color = data.color;
    if (data.size !== undefined) pet.size = data.size;
    if (data.weight !== undefined) pet.weight = data.weight;

    return pet;
  }

  /**
   * Create a new pet with generated ID
   * Utility method for pet creation
   */
  public static create(
    name: string,
    species: PetSpecies,
    storeId: string,
    breed?: string,
    age?: number,
    price?: number,
  ): Pet {
    // Generate pet ID (in real implementation, this might come from a service)
    const timestamp = Date.now();
    const id = `pet-${timestamp}`;
    
    return new Pet(id, name, species, storeId, breed, age, price);
  }

  /**
   * Get formatted display name
   * Combines name and breed for display
   */
  public getDisplayName(): string {
    return this.breed ? `${this.name} (${this.breed})` : this.name;
  }

  /**
   * Get formatted price string
   */
  public getFormattedPrice(): string {
    return this.price ? `$${this.price.toFixed(2)}` : 'Price not set';
  }
}