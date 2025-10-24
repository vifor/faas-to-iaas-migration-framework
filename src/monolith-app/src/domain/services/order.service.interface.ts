/**
 * Order Domain Service Interface
 * 
 * Defines the contract for order business logic operations.
 * Handles order processing and management within store contexts.
 */

import { Order, OrderStatus } from '../entities/order.entity';

export interface IOrderService {
  /**
   * Create a new order with business rules validation
   * @param orderData Order creation data
   * @returns Promise resolving to the created order
   */
  createOrder(orderData: {
    petId: string;
    customerId: string;
    quantity: number;
    storeId: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    deliveryAddress?: string;
    notes?: string;
  }): Promise<Order>;

  /**
   * Get an order by order number
   * @param orderNumber The order number to retrieve
   * @returns Promise resolving to the order or null if not found
   */
  getOrderByOrderNumber(orderNumber: string): Promise<Order | null>;

  /**
   * Get all orders in a store
   * @param storeId The store ID to search for orders
   * @returns Promise resolving to array of orders in the store
   */
  getOrdersByStore(storeId: string): Promise<Order[]>;

  /**
   * Get all orders for a customer
   * @param customerId The customer ID to search for orders
   * @returns Promise resolving to array of orders for the customer
   */
  getOrdersByCustomer(customerId: string): Promise<Order[]>;

  /**
   * Get all orders
   * @returns Promise resolving to array of all orders
   */
  getAllOrders(): Promise<Order[]>;

  /**
   * Update order information
   * @param orderNumber The order number to update
   * @param updateData Data to update
   * @returns Promise resolving to the updated order
   */
  updateOrder(
    orderNumber: string,
    updateData: {
      customerName?: string;
      customerEmail?: string;
      customerPhone?: string;
      deliveryAddress?: string;
      deliveryDate?: Date;
      notes?: string;
      paymentMethod?: string;
      paymentStatus?: 'pending' | 'paid' | 'failed';
    },
  ): Promise<Order>;

  /**
   * Cancel an order
   * @param orderNumber The order number to cancel
   * @returns Promise resolving to the cancelled order
   */
  cancelOrder(orderNumber: string): Promise<Order>;

  /**
   * Approve an order
   * @param orderNumber The order number to approve
   * @returns Promise resolving to the approved order
   */
  approveOrder(orderNumber: string): Promise<Order>;

  /**
   * Mark order as delivered
   * @param orderNumber The order number to mark as delivered
   * @returns Promise resolving to the delivered order
   */
  markOrderAsDelivered(orderNumber: string): Promise<Order>;

  /**
   * Process order payment
   * @param orderNumber The order number
   * @param paymentMethod The payment method used
   * @returns Promise resolving to the updated order
   */
  processOrderPayment(
    orderNumber: string,
    paymentMethod: string,
  ): Promise<Order>;

  /**
   * Get orders by status
   * @param status The order status to filter by
   * @returns Promise resolving to array of orders with matching status
   */
  getOrdersByStatus(status: OrderStatus): Promise<Order[]>;

  /**
   * Get pending orders for a store
   * @param storeId The store ID
   * @returns Promise resolving to array of pending orders
   */
  getPendingOrdersForStore(storeId: string): Promise<Order[]>;

  /**
   * Search orders with filters
   * @param filters Search criteria
   * @returns Promise resolving to array of orders matching filters
   */
  searchOrdersWithFilters(filters: {
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
   * Get recent orders for a store
   * @param storeId The store ID
   * @param limit Maximum number of orders to return
   * @returns Promise resolving to array of recent orders
   */
  getRecentOrdersForStore(storeId: string, limit: number): Promise<Order[]>;

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
    topCustomers: Array<{
      customerId: string;
      orderCount: number;
      totalSpent: number;
    }>;
  }>;

  /**
   * Get order statistics for a date range
   * @param storeId The store ID
   * @param startDate Start date
   * @param endDate End date
   * @returns Promise resolving to order statistics for the period
   */
  getOrderStatsForPeriod(
    storeId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalOrders: number;
    totalRevenue: number;
    ordersByDay: Array<{
      date: string;
      orderCount: number;
      revenue: number;
    }>;
  }>;

  /**
   * Calculate order total from pet price and quantity
   * @param petId The pet ID to get price for
   * @param quantity The quantity ordered
   * @returns Promise resolving to the calculated total
   */
  calculateOrderTotal(petId: string, quantity: number): Promise<number>;

  /**
   * Validate order business rules
   * @param order The order to validate
   * @returns Array of validation errors (empty if valid)
   */
  validateOrder(order: Order): Promise<string[]>;

  /**
   * Check if order can be cancelled
   * @param orderNumber The order number to check
   * @returns Promise resolving to true if can be cancelled
   */
  canCancelOrder(orderNumber: string): Promise<boolean>;

  /**
   * Check if order can be modified
   * @param orderNumber The order number to check
   * @returns Promise resolving to true if can be modified
   */
  canModifyOrder(orderNumber: string): Promise<boolean>;

  /**
   * Check pet availability for order
   * @param petId The pet ID to check
   * @param quantity The quantity needed
   * @returns Promise resolving to true if pet is available
   */
  checkPetAvailability(petId: string, quantity: number): Promise<boolean>;
}