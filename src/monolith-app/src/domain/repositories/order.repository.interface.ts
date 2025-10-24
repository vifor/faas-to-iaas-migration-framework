/**
 * Order Repository Port Interface
 * 
 * Defines the contract for order data persistence operations.
 * Handles order management within store contexts.
 * 
 * Part of the hexagonal architecture - this is a "port" that defines
 * what operations are needed without specifying implementation details.
 */

import { Order, OrderStatus } from '../entities/order.entity';

export interface IOrderRepository {
  /**
   * Create a new order
   * @param order The order entity to create
   * @returns Promise resolving to the created order
   */
  create(order: Order): Promise<Order>;

  /**
   * Find an order by its order number
   * @param orderNumber The order number to search for
   * @returns Promise resolving to the order or null if not found
   */
  findByOrderNumber(orderNumber: string): Promise<Order | null>;

  /**
   * Find all orders in a specific store
   * @param storeId The store ID to search for orders
   * @returns Promise resolving to array of orders in the store
   */
  findByStoreId(storeId: string): Promise<Order[]>;

  /**
   * Find all orders for a specific customer
   * @param customerId The customer ID to search for orders
   * @returns Promise resolving to array of orders for the customer
   */
  findByCustomerId(customerId: string): Promise<Order[]>;

  /**
   * Find all orders
   * @returns Promise resolving to array of all orders
   */
  findAll(): Promise<Order[]>;

  /**
   * Update an existing order
   * @param order The order entity with updated data
   * @returns Promise resolving to the updated order
   */
  update(order: Order): Promise<Order>;

  /**
   * Delete an order by order number
   * @param orderNumber The order number to delete
   * @returns Promise resolving to true if deleted, false if not found
   */
  delete(orderNumber: string): Promise<boolean>;

  /**
   * Check if an order exists
   * @param orderNumber The order number to check
   * @returns Promise resolving to true if exists, false otherwise
   */
  exists(orderNumber: string): Promise<boolean>;

  /**
   * Find orders by status
   * @param status The order status to search for
   * @returns Promise resolving to array of orders with matching status
   */
  findByStatus(status: OrderStatus): Promise<Order[]>;

  /**
   * Find orders by status in a specific store
   * @param storeId The store ID to search in
   * @param status The order status to search for
   * @returns Promise resolving to array of orders matching criteria
   */
  findByStoreAndStatus(storeId: string, status: OrderStatus): Promise<Order[]>;

  /**
   * Find orders for a specific pet
   * @param petId The pet ID to search for orders
   * @returns Promise resolving to array of orders for the pet
   */
  findByPetId(petId: string): Promise<Order[]>;

  /**
   * Find orders within a date range
   * @param startDate Start date (inclusive)
   * @param endDate End date (inclusive)
   * @returns Promise resolving to array of orders within date range
   */
  findByDateRange(startDate: Date, endDate: Date): Promise<Order[]>;

  /**
   * Find orders within a total amount range
   * @param minAmount Minimum amount (inclusive)
   * @param maxAmount Maximum amount (inclusive)
   * @returns Promise resolving to array of orders within amount range
   */
  findByAmountRange(minAmount: number, maxAmount: number): Promise<Order[]>;

  /**
   * Get the total count of orders
   * @returns Promise resolving to the total number of orders
   */
  count(): Promise<number>;

  /**
   * Get the count of orders in a specific store
   * @param storeId The store ID to count orders for
   * @returns Promise resolving to the number of orders in the store
   */
  countByStore(storeId: string): Promise<number>;

  /**
   * Get the count of orders for a specific customer
   * @param customerId The customer ID to count orders for
   * @returns Promise resolving to the number of orders for the customer
   */
  countByCustomer(customerId: string): Promise<number>;

  /**
   * Get orders with pagination
   * @param limit Maximum number of orders to return
   * @param lastKey Optional last evaluated key for pagination
   * @returns Promise resolving to paginated order results
   */
  findWithPagination(
    limit: number,
    lastKey?: Record<string, any>,
  ): Promise<{
    orders: Order[];
    lastEvaluatedKey?: Record<string, any>;
    hasMore: boolean;
  }>;

  /**
   * Search orders with multiple filters
   * @param filters Search criteria
   * @returns Promise resolving to array of orders matching all filters
   */
  findWithFilters(filters: {
    storeId?: string;
    customerId?: string;
    status?: OrderStatus;
    petId?: string;
    startDate?: Date;
    endDate?: Date;
    minAmount?: number;
    maxAmount?: number;
  }): Promise<Order[]>;

  /**
   * Get order statistics for a store
   * @param storeId The store ID to get statistics for
   * @returns Promise resolving to order statistics
   */
  getStoreOrderStats(storeId: string): Promise<{
    totalOrders: number;
    totalRevenue: number;
    ordersByStatus: Record<OrderStatus, number>;
    averageOrderValue: number;
  }>;

  /**
   * Get recent orders for a store
   * @param storeId The store ID to get recent orders for
   * @param limit Maximum number of recent orders to return
   * @returns Promise resolving to array of recent orders
   */
  findRecentByStore(storeId: string, limit: number): Promise<Order[]>;
}