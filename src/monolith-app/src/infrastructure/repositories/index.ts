/**
 * Infrastructure Repositories Export Index
 * 
 * Centralized export point for all DynamoDB repository implementations.
 * These adapters implement the repository interfaces defined in the domain layer,
 * following the hexagonal architecture pattern.
 * 
 * Each repository provides:
 * - Full CRUD operations
 * - Business-specific query methods
 * - Error handling and logging
 * - Data mapping between domain entities and DynamoDB items
 */

export { DynamoDBFranchiseRepository } from './dynamodb-franchise.repository';
export { DynamoDBStoreRepository } from './dynamodb-store.repository';
export { DynamoDBPetRepository } from './dynamodb-pet.repository';
export { DynamoDBOrderRepository } from './dynamodb-order.repository';
export { DynamoDBUserRepository } from './dynamodb-user.repository';