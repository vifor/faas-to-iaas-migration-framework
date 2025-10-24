/**
 * DynamoDB Order Repository Implementation
 * 
 * Infrastructure adapter that implements IOrderRepository interface.
 * Handles all CRUD operations for orders in DynamoDB.
 * 
 * Note: Orders use a specific prefix pattern in the tenants table
 * to separate them from other entity types while maintaining
 * the existing table structure.
 * 
 * Operations Supported:
 * - Create/Update orders
 * - Find by ID, customer, status
 * - Query operations for business logic
 * - Order management and tracking
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IOrderRepository } from '../../domain/repositories/order.repository.interface';
import { Order, OrderStatus } from '../../domain/entities/order.entity';
import { DynamoDBService } from '../../database/dynamodb.service';

@Injectable()
export class DynamoDBOrderRepository implements IOrderRepository {
  private readonly logger = new Logger(DynamoDBOrderRepository.name);
  private readonly tableName: string;

  constructor(
    private readonly dynamoDBService: DynamoDBService,
    private readonly configService: ConfigService,
  ) {
    // Using tenants table for orders with a specific prefix pattern
    const baseTableName = this.configService.get<string>('aws.tenantsTableName');
    const env = this.configService.get<string>('aws.env');
    this.tableName = env && env !== 'NONE' ? `${baseTableName}-${env}` : baseTableName;
    
    this.logger.log(`📦 Order Repository initialized for table: ${this.tableName}`);
  }

  /**
   * Create a new order
   */
  async create(order: Order): Promise<Order> {
    try {
      this.logger.debug(`Creating order: ${order.orderNumber}`);
      
      const item = this.toItemFormat(order);
      
      // Use store operation with order-specific composite key
      await this.dynamoDBService.putStore(item);
      
      this.logger.log(`✅ Created order: ${order.orderNumber}`);
      return order;
    } catch (error) {
      this.logger.error(`❌ Failed to create order ${order.orderNumber}:`, error);
      throw new Error(`Failed to create order: ${error.message}`);
    }
  }

  /**
   * Find an order by its order number
   */
  async findByOrderNumber(orderNumber: string): Promise<Order | null> {
    try {
      this.logger.debug(`Finding order by order number: ${orderNumber}`);
      
      // Use composite key with order prefix
      const item = await this.dynamoDBService.getStore('ORDER', orderNumber);
      
      if (!item) {
        this.logger.debug(`Order not found: ${orderNumber}`);
        return null;
      }

      const order = this.fromItemFormat(item);
      this.logger.debug(`✅ Found order: ${orderNumber}`);
      return order;
    } catch (error) {
      this.logger.error(`❌ Failed to find order ${orderNumber}:`, error);
      throw new Error(`Failed to find order: ${error.message}`);
    }
  }

  /**
   * Find an order by ID (alias for findByOrderNumber for compatibility)
   */
  async findById(orderNumber: string): Promise<Order | null> {
    return this.findByOrderNumber(orderNumber);
  }

  /**
   * Find all orders
   */
  async findAll(): Promise<Order[]> {
    try {
      this.logger.debug('Finding all orders');
      
      // Query by partition key prefix for orders
      const result = await this.dynamoDBService.queryStores({ id: 'ORDER' });
      const items = result.Items || [];
      
      const orders = items.map(item => this.fromItemFormat(item));
      
      this.logger.log(`✅ Found ${orders.length} orders`);
      return orders;
    } catch (error) {
      this.logger.error('❌ Failed to find all orders:', error);
      throw new Error(`Failed to find orders: ${error.message}`);
    }
  }

  /**
   * Update an existing order
   */
  async update(order: Order): Promise<Order> {
    try {
      this.logger.debug(`Updating order: ${order.orderNumber}`);
      
      // Check if order exists
      const existingOrder = await this.findByOrderNumber(order.orderNumber);
      if (!existingOrder) {
        throw new Error(`Order with number ${order.orderNumber} not found`);
      }

      // Update timestamp
      order.updatedAt = new Date();
      
      const item = this.toItemFormat(order);
      
      await this.dynamoDBService.putStore(item);
      
      this.logger.log(`✅ Updated order: ${order.orderNumber}`);
      return order;
    } catch (error) {
      this.logger.error(`❌ Failed to update order ${order.orderNumber}:`, error);
      throw new Error(`Failed to update order: ${error.message}`);
    }
  }

  /**
   * Delete an order by order number
   */
  async delete(orderNumber: string): Promise<boolean> {
    try {
      this.logger.debug(`Deleting order: ${orderNumber}`);
      
      // Check if order exists
      const existingOrder = await this.findByOrderNumber(orderNumber);
      if (!existingOrder) {
        this.logger.debug(`Order not found for deletion: ${orderNumber}`);
        return false;
      }

      await this.dynamoDBService.deleteStore('ORDER', orderNumber);
      
      this.logger.log(`✅ Deleted order: ${orderNumber}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Failed to delete order ${orderNumber}:`, error);
      throw new Error(`Failed to delete order: ${error.message}`);
    }
  }

  /**
   * Check if an order exists by order number
   */
  async exists(orderNumber: string): Promise<boolean> {
    try {
      const order = await this.findByOrderNumber(orderNumber);
      return order !== null;
    } catch (error) {
      this.logger.error(`❌ Failed to check order existence ${orderNumber}:`, error);
      return false;
    }
  }

  /**
   * Find orders by customer ID
   */
  async findByCustomerId(customerId: string): Promise<Order[]> {
    try {
      this.logger.debug(`Finding orders by customer ID: ${customerId}`);
      
      const allOrders = await this.findAll();
      const customerOrders = allOrders.filter(order => order.customerId === customerId);
      
      this.logger.debug(`✅ Found ${customerOrders.length} orders for customer: ${customerId}`);
      return customerOrders;
    } catch (error) {
      this.logger.error(`❌ Failed to find orders by customer ID ${customerId}:`, error);
      throw new Error(`Failed to find orders by customer: ${error.message}`);
    }
  }

  /**
   * Find orders by status
   */
  async findByStatus(status: OrderStatus): Promise<Order[]> {
    try {
      this.logger.debug(`Finding orders by status: ${status}`);
      
      const allOrders = await this.findAll();
      const statusOrders = allOrders.filter(order => order.status === status);
      
      this.logger.debug(`✅ Found ${statusOrders.length} orders with status: ${status}`);
      return statusOrders;
    } catch (error) {
      this.logger.error(`❌ Failed to find orders by status ${status}:`, error);
      throw new Error(`Failed to find orders by status: ${error.message}`);
    }
  }

  /**
   * Find orders by store ID
   */
  async findByStoreId(storeId: string): Promise<Order[]> {
    try {
      this.logger.debug(`Finding orders by store ID: ${storeId}`);
      
      const allOrders = await this.findAll();
      const storeOrders = allOrders.filter(order => order.storeId === storeId);
      
      this.logger.debug(`✅ Found ${storeOrders.length} orders for store: ${storeId}`);
      return storeOrders;
    } catch (error) {
      this.logger.error(`❌ Failed to find orders by store ID ${storeId}:`, error);
      throw new Error(`Failed to find orders by store: ${error.message}`);
    }
  }

  /**
   * Find orders by customer and status
   */
  async findByCustomerAndStatus(customerId: string, status: OrderStatus): Promise<Order[]> {
    try {
      this.logger.debug(`Finding orders by customer ${customerId} and status ${status}`);
      
      const customerOrders = await this.findByCustomerId(customerId);
      const filteredOrders = customerOrders.filter(order => order.status === status);
      
      this.logger.debug(`✅ Found ${filteredOrders.length} orders for customer ${customerId} with status ${status}`);
      return filteredOrders;
    } catch (error) {
      this.logger.error(`❌ Failed to find orders by customer and status:`, error);
      throw new Error(`Failed to find orders by customer and status: ${error.message}`);
    }
  }

  /**
   * Find orders by store and status
   */
  async findByStoreAndStatus(storeId: string, status: OrderStatus): Promise<Order[]> {
    try {
      this.logger.debug(`Finding orders by store ${storeId} and status ${status}`);
      
      const storeOrders = await this.findByStoreId(storeId);
      const filteredOrders = storeOrders.filter(order => order.status === status);
      
      this.logger.debug(`✅ Found ${filteredOrders.length} orders for store ${storeId} with status ${status}`);
      return filteredOrders;
    } catch (error) {
      this.logger.error(`❌ Failed to find orders by store and status:`, error);
      throw new Error(`Failed to find orders by store and status: ${error.message}`);
    }
  }

  /**
   * Find orders within a date range
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<Order[]> {
    try {
      this.logger.debug(`Finding orders by date range: ${startDate.toISOString()} - ${endDate.toISOString()}`);
      
      const allOrders = await this.findAll();
      const dateOrders = allOrders.filter(order =>
        order.createdAt >= startDate && order.createdAt <= endDate
      );
      
      this.logger.debug(`✅ Found ${dateOrders.length} orders in date range`);
      return dateOrders;
    } catch (error) {
      this.logger.error(`❌ Failed to find orders by date range:`, error);
      throw new Error(`Failed to find orders by date range: ${error.message}`);
    }
  }

  /**
   * Find orders within a total amount range
   */
  async findByTotalRange(minTotal: number, maxTotal: number): Promise<Order[]> {
    try {
      this.logger.debug(`Finding orders by total range: $${minTotal} - $${maxTotal}`);
      
      const allOrders = await this.findAll();
      const totalOrders = allOrders.filter(order =>
        order.totalAmount >= minTotal && order.totalAmount <= maxTotal
      );
      
      this.logger.debug(`✅ Found ${totalOrders.length} orders in total range`);
      return totalOrders;
    } catch (error) {
      this.logger.error(`❌ Failed to find orders by total range:`, error);
      throw new Error(`Failed to find orders by total range: ${error.message}`);
    }
  }

  /**
   * Find orders within an amount range (alias for compatibility)
   */
  async findByAmountRange(minAmount: number, maxAmount: number): Promise<Order[]> {
    return this.findByTotalRange(minAmount, maxAmount);
  }

  /**
   * Find orders for a specific pet
   */
  async findByPetId(petId: string): Promise<Order[]> {
    try {
      this.logger.debug(`Finding orders by pet ID: ${petId}`);
      
      const allOrders = await this.findAll();
      const petOrders = allOrders.filter(order => order.petId === petId);
      
      this.logger.debug(`✅ Found ${petOrders.length} orders for pet: ${petId}`);
      return petOrders;
    } catch (error) {
      this.logger.error(`❌ Failed to find orders by pet ID ${petId}:`, error);
      throw new Error(`Failed to find orders by pet: ${error.message}`);
    }
  }

  /**
   * Get the count of orders in a specific store
   */
  async countByStore(storeId: string): Promise<number> {
    try {
      this.logger.debug(`Counting orders in store: ${storeId}`);
      
      const storeOrders = await this.findByStoreId(storeId);
      const count = storeOrders.length;
      
      this.logger.debug(`✅ Store ${storeId} has ${count} orders`);
      return count;
    } catch (error) {
      this.logger.error(`❌ Failed to count orders in store ${storeId}:`, error);
      throw new Error(`Failed to count orders in store: ${error.message}`);
    }
  }

  /**
   * Get the total count of orders
   */
  async count(): Promise<number> {
    try {
      this.logger.debug('Counting all orders');
      
      const orders = await this.findAll();
      const count = orders.length;
      
      this.logger.debug(`✅ Total order count: ${count}`);
      return count;
    } catch (error) {
      this.logger.error('❌ Failed to count orders:', error);
      throw new Error(`Failed to count orders: ${error.message}`);
    }
  }

  /**
   * Get the count of orders for a customer
   */
  async countByCustomer(customerId: string): Promise<number> {
    try {
      this.logger.debug(`Counting orders for customer: ${customerId}`);
      
      const customerOrders = await this.findByCustomerId(customerId);
      const count = customerOrders.length;
      
      this.logger.debug(`✅ Customer ${customerId} has ${count} orders`);
      return count;
    } catch (error) {
      this.logger.error(`❌ Failed to count orders for customer ${customerId}:`, error);
      throw new Error(`Failed to count orders for customer: ${error.message}`);
    }
  }

  /**
   * Get orders with pagination
   */
  async findWithPagination(
    limit: number,
    lastKey?: Record<string, any>,
  ): Promise<{
    orders: Order[];
    lastEvaluatedKey?: Record<string, any>;
    hasMore: boolean;
  }> {
    try {
      this.logger.debug(`Finding orders with pagination: limit=${limit}`);
      
      const result = await this.dynamoDBService.queryStores({
        id: 'ORDER',
        limit,
        exclusiveStartKey: lastKey,
      });
      
      const items = result.Items || [];
      const orders = items.map(item => this.fromItemFormat(item));
      
      const response = {
        orders,
        lastEvaluatedKey: result.LastEvaluatedKey,
        hasMore: !!result.LastEvaluatedKey,
      };
      
      this.logger.debug(`✅ Found ${orders.length} orders with pagination`);
      return response;
    } catch (error) {
      this.logger.error('❌ Failed to find orders with pagination:', error);
      throw new Error(`Failed to find orders with pagination: ${error.message}`);
    }
  }

  /**
   * Search orders with multiple filters
   */
  async findWithFilters(filters: {
    customerId?: string;
    storeId?: string;
    status?: OrderStatus;
    petId?: string;
    startDate?: Date;
    endDate?: Date;
    minAmount?: number;
    maxAmount?: number;
  }): Promise<Order[]> {
    try {
      this.logger.debug('Finding orders with filters:', filters);
      
      let orders = await this.findAll();
      
      // Apply filters sequentially
      if (filters.customerId) {
        orders = orders.filter(order => order.customerId === filters.customerId);
      }
      
      if (filters.storeId) {
        orders = orders.filter(order => order.storeId === filters.storeId);
      }
      
      if (filters.status) {
        orders = orders.filter(order => order.status === filters.status);
      }
      
      if (filters.petId) {
        orders = orders.filter(order => order.petId === filters.petId);
      }
      
      if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
        orders = orders.filter(order => {
          if (filters.minAmount !== undefined && order.totalAmount < filters.minAmount) return false;
          if (filters.maxAmount !== undefined && order.totalAmount > filters.maxAmount) return false;
          return true;
        });
      }
      
      if (filters.startDate || filters.endDate) {
        orders = orders.filter(order => {
          if (filters.startDate && order.orderDate < filters.startDate) return false;
          if (filters.endDate && order.orderDate > filters.endDate) return false;
          return true;
        });
      }
      
      this.logger.debug(`✅ Found ${orders.length} orders matching filters`);
      return orders;
    } catch (error) {
      this.logger.error('❌ Failed to find orders with filters:', error);
      throw new Error(`Failed to find orders with filters: ${error.message}`);
    }
  }

  /**
   * Get order statistics for a store
   */
  async getStoreOrderStats(storeId: string): Promise<{
    totalOrders: number;
    totalRevenue: number;
    ordersByStatus: Record<OrderStatus, number>;
    averageOrderValue: number;
  }> {
    try {
      this.logger.debug(`Getting order stats for store: ${storeId}`);
      
      const storeOrders = await this.findByStoreId(storeId);
      const deliveredOrders = storeOrders.filter(order => order.status === 'delivered');
      
      const totalOrders = storeOrders.length;
      const totalRevenue = deliveredOrders.reduce((sum, order) => sum + order.totalAmount, 0);
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      
      const ordersByStatus: Record<OrderStatus, number> = {
        placed: 0,
        approved: 0,
        delivered: 0,
        cancelled: 0,
      };
      
      storeOrders.forEach(order => {
        ordersByStatus[order.status] = (ordersByStatus[order.status] || 0) + 1;
      });
      
      const stats = {
        totalOrders,
        totalRevenue,
        ordersByStatus,
        averageOrderValue,
      };
      
      this.logger.debug(`✅ Store ${storeId} stats:`, stats);
      return stats;
    } catch (error) {
      this.logger.error(`❌ Failed to get store order stats ${storeId}:`, error);
      throw new Error(`Failed to get store order stats: ${error.message}`);
    }
  }

  /**
   * Get recent orders for a store
   */
  async findRecentByStore(storeId: string, limit: number): Promise<Order[]> {
    try {
      this.logger.debug(`Finding recent orders for store ${storeId}, limit: ${limit}`);
      
      const storeOrders = await this.findByStoreId(storeId);
      
      // Sort by order date (most recent first) and limit
      const recentOrders = storeOrders
        .sort((a, b) => b.orderDate.getTime() - a.orderDate.getTime())
        .slice(0, limit);
      
      this.logger.debug(`✅ Found ${recentOrders.length} recent orders for store ${storeId}`);
      return recentOrders;
    } catch (error) {
      this.logger.error(`❌ Failed to find recent orders for store ${storeId}:`, error);
      throw new Error(`Failed to find recent orders for store: ${error.message}`);
    }
  }

  /**
   * Get recent orders (last N days) - fixed method
   */
  async findRecent(days: number = 7): Promise<Order[]> {
    try {
      this.logger.debug(`Finding recent orders (last ${days} days)`);
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      return await this.findByDateRange(startDate, endDate);
    } catch (error) {
      this.logger.error('❌ Failed to find recent orders:', error);
      throw new Error(`Failed to find recent orders: ${error.message}`);
    }
  }

  /**
   * Update order status
   */
  async updateStatus(orderNumber: string, status: OrderStatus): Promise<Order> {
    try {
      this.logger.debug(`Updating order status: ${orderNumber} -> ${status}`);
      
      const order = await this.findByOrderNumber(orderNumber);
      if (!order) {
        throw new Error(`Order with number ${orderNumber} not found`);
      }

      order.updateStatus(status);
      
      return await this.update(order);
    } catch (error) {
      this.logger.error(`❌ Failed to update order status ${orderNumber}:`, error);
      throw new Error(`Failed to update order status: ${error.message}`);
    }
  }

  /**
   * Calculate total revenue for a date range
   */
  async calculateRevenue(startDate: Date, endDate: Date): Promise<number> {
    try {
      this.logger.debug(`Calculating revenue for date range: ${startDate.toISOString()} - ${endDate.toISOString()}`);
      
      const orders = await this.findByDateRange(startDate, endDate);
      const deliveredOrders = orders.filter(order => order.status === 'delivered');
      const revenue = deliveredOrders.reduce((sum, order) => sum + order.totalAmount, 0);
      
      this.logger.debug(`✅ Revenue for period: $${revenue.toFixed(2)}`);
      return revenue;
    } catch (error) {
      this.logger.error('❌ Failed to calculate revenue:', error);
      throw new Error(`Failed to calculate revenue: ${error.message}`);
    }
  }

  /**
   * Convert Order entity to DynamoDB item format
   */
  private toItemFormat(order: Order): Record<string, any> {
    const item: Record<string, any> = {
      id: 'ORDER', // Partition key prefix for orders
      value: order.orderNumber, // Sort key is the order number
      orderNumber: order.orderNumber,
      petId: order.petId,
      customerId: order.customerId,
      storeId: order.storeId,
      status: order.status,
      quantity: order.quantity,
      totalAmount: order.totalAmount,
      orderDate: order.orderDate.toISOString(),
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };

    // Add optional fields only if they exist
    if (order.notes) item.notes = order.notes;
    if (order.customerName) item.customerName = order.customerName;
    if (order.customerEmail) item.customerEmail = order.customerEmail;
    if (order.customerPhone) item.customerPhone = order.customerPhone;
    if (order.deliveryAddress) item.deliveryAddress = order.deliveryAddress;
    if (order.deliveryDate) item.deliveryDate = order.deliveryDate.toISOString();
    if (order.paymentMethod) item.paymentMethod = order.paymentMethod;
    if (order.paymentStatus) item.paymentStatus = order.paymentStatus;

    return item;
  }

  /**
   * Convert DynamoDB item to Order entity format
   */
  private fromItemFormat(item: Record<string, any>): Order {
    const order = new Order(
      item.orderNumber || item.value, // Use orderNumber attribute or fallback to value
      item.petId,
      item.customerId,
      item.quantity,
      item.totalAmount,
      item.storeId,
      item.status || 'placed',
      item.orderDate ? new Date(item.orderDate) : undefined,
      item.createdAt ? new Date(item.createdAt) : undefined,
      item.updatedAt ? new Date(item.updatedAt) : undefined,
    );

    // Set additional optional properties
    if (item.notes) order.notes = item.notes;
    if (item.customerName) order.customerName = item.customerName;
    if (item.customerEmail) order.customerEmail = item.customerEmail;
    if (item.customerPhone) order.customerPhone = item.customerPhone;
    if (item.deliveryAddress) order.deliveryAddress = item.deliveryAddress;
    if (item.deliveryDate) order.deliveryDate = new Date(item.deliveryDate);
    if (item.paymentMethod) order.paymentMethod = item.paymentMethod;
    if (item.paymentStatus) order.paymentStatus = item.paymentStatus;

    return order;
  }
}