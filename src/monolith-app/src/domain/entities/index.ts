/**
 * Domain Entities Export
 * 
 * Centralized export of all domain entities for the PetStore application.
 * Provides a clean interface for importing domain entities throughout the application.
 */

// Core entities
export { Franchise } from './franchise.entity';
export { Store, StoreStatus } from './store.entity';
export { Pet, PetStatus, PetSpecies } from './pet.entity';
export { Order, OrderStatus } from './order.entity';

// Type exports for convenience
export type {
  StoreStatus as StoreStatusType,
} from './store.entity';

export type {
  PetStatus as PetStatusType,
  PetSpecies as PetSpeciesType,
} from './pet.entity';

export type {
  OrderStatus as OrderStatusType,
} from './order.entity';