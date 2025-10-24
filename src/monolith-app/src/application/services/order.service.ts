/**
 * Order Application Service
 * 
 * Implements business logic and use cases for order management.
 * Orchestrates domain entities and repository operations following
 * hexagonal architecture principles.
 * 
 * This service layer handles:
 * - Order lifecycle management
 * - Customer-order relationships
 * - Pet-order associations
 * - Payment processing coordination
 * - Business rule validation
 * - Order status transitions
 */

import { Injectable, Logger, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Order, OrderStatus } from '../../domain/entities/order.entity';
import { IOrderRepository } from '../../domain/repositories/order.repository.interface';
import { IPetRepository } from '../../domain/repositories/pet.repository.interface';
import { ORDER_REPOSITORY, PET_REPOSITORY } from '../../infrastructure/infrastructure.module';
import { CreateOrderDto, UpdateOrderDto, OrderResponseDto, OrderStatsResponseDto } from '../dtos/order.dto';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: IOrderRepository,
    @Inject(PET_REPOSITORY)
    private readonly petRepository: IPetRepository,
  ) {
    this.logger.log('📦 Order Service initialized');
  }

  /**
   * Create a new order
   * Business Rules:
   * - Customer information is required
   * - Pet must exist and be available
   * - Order total must be calculated correctly
   * - Pet status is updated to pending
   */
  async createOrder(createDto: CreateOrderDto, storeId: string): Promise<OrderResponseDto> {
    try {
      this.logger.debug(`Creating order for customer: ${createDto.customerId}`);

      // Validate pet exists and is available
      const pet = await this.petRepository.findById(createDto.petId);
      if (!pet) {
        throw new BadRequestException(`Pet with ID ${createDto.petId} not found`);
      }

      if (!pet.isAvailable()) {
        throw new ConflictException(`Pet ${createDto.petId} is not available for purchase`);
      }

      // Generate order number
      const orderNumber = this.generateOrderId();

      // Calculate total amount from pet price and quantity
      const unitPrice = pet.price || 0;
      const totalAmount = unitPrice * createDto.quantity;

      // Create domain entity from DTO
      const order = new Order(
        orderNumber,
        createDto.petId,
        createDto.customerId,
        createDto.quantity,
        totalAmount,
        storeId,
        'placed',
        new Date(),
      );

      // Set additional properties if provided
      if (createDto.customerName) order.customerName = createDto.customerName;
      if (createDto.customerEmail) order.customerEmail = createDto.customerEmail;
      if (createDto.customerPhone) order.customerPhone = createDto.customerPhone;
      if (createDto.deliveryAddress) order.deliveryAddress = createDto.deliveryAddress;
      if (createDto.notes) order.notes = createDto.notes;

      // Validate business rules
      const validationErrors = order.validate();
      if (validationErrors.length > 0) {
        throw new BadRequestException(`Validation failed: ${validationErrors.join(', ')}`);
      }

      // Mark pet as pending
      pet.markAsPending();
      await this.petRepository.update(pet);

      // Persist the order
      const savedOrder = await this.orderRepository.create(order);

      this.logger.log(`✅ Created order: ${savedOrder.orderNumber}`);
      return this.toResponseDto(savedOrder);
    } catch (error) {
      this.logger.error(`❌ Failed to create order: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get order by order number
   */
  async getOrderByNumber(orderNumber: string): Promise<OrderResponseDto> {
    try {
      this.logger.debug(`Getting order by order number: ${orderNumber}`);

      const order = await this.orderRepository.findByOrderNumber(orderNumber);
      if (!order) {
        throw new NotFoundException(`Order with number ${orderNumber} not found`);
      }

      this.logger.debug(`✅ Found order: ${orderNumber}`);
      return this.toResponseDto(order);
    } catch (error) {
      this.logger.error(`❌ Failed to get order ${orderNumber}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get all orders with optional filtering
   */
  async getAllOrders(
    status?: OrderStatus,
    customerId?: string,
    limit?: number,
    lastKey?: Record<string, any>,
  ): Promise<{
    orders: OrderResponseDto[];
    lastEvaluatedKey?: Record<string, any>;
    hasMore: boolean;
  }> {
    try {
      this.logger.debug(`Getting all orders - status: ${status}, customer: ${customerId}, limit: ${limit}`);

      let orders: Order[];
      let lastEvaluatedKey: Record<string, any> | undefined;
      let hasMore = false;

      if (limit && limit > 0) {
        // Paginated request
        const result = await this.orderRepository.findWithPagination(limit, lastKey);
        orders = result.orders;
        lastEvaluatedKey = result.lastEvaluatedKey;
        hasMore = result.hasMore;
      } else {
        // Get all orders
        orders = await this.orderRepository.findAll();
      }

      // Apply filters
      if (status) {
        orders = orders.filter(order => order.status === status);
      }

      if (customerId) {
        orders = orders.filter(order => order.customerId === customerId);
      }

      const response = {
        orders: orders.map(order => this.toResponseDto(order)),
        lastEvaluatedKey,
        hasMore,
      };

      this.logger.debug(`✅ Found ${orders.length} orders`);
      return response;
    } catch (error) {
      this.logger.error(`❌ Failed to get orders: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update order information
   * Business Rules:
   * - Order must exist
   * - Cannot update delivered orders
   * - Status transitions must be valid
   */
  async updateOrder(orderNumber: string, updateDto: UpdateOrderDto): Promise<OrderResponseDto> {
    try {
      this.logger.debug(`Updating order: ${orderNumber}`);

      // Get existing order
      const existingOrder = await this.orderRepository.findByOrderNumber(orderNumber);
      if (!existingOrder) {
        throw new NotFoundException(`Order with number ${orderNumber} not found`);
      }

      // Business rule: Cannot update delivered orders
      if (existingOrder.status === 'delivered') {
        throw new ConflictException(`Cannot update delivered order ${orderNumber}`);
      }

      // Update customer information
      if (updateDto.customerName !== undefined || updateDto.customerEmail !== undefined || 
          updateDto.customerPhone !== undefined || updateDto.deliveryAddress !== undefined) {
        existingOrder.updateCustomerInfo(
          updateDto.customerName,
          updateDto.customerEmail,
          updateDto.customerPhone,
        );
        
        // Update delivery address separately
        if (updateDto.deliveryAddress !== undefined) {
          existingOrder.updateDeliveryInfo(updateDto.deliveryAddress);
        }
      }

      // Update payment information
      if (updateDto.paymentMethod !== undefined || updateDto.paymentStatus !== undefined) {
        existingOrder.updatePaymentInfo(
          updateDto.paymentMethod,
          updateDto.paymentStatus,
        );
      }

      // Update notes
      if (updateDto.notes !== undefined) {
        existingOrder.updateNotes(updateDto.notes);
      }

      // Validate business rules after update
      const validationErrors = existingOrder.validate();
      if (validationErrors.length > 0) {
        throw new BadRequestException(`Validation failed: ${validationErrors.join(', ')}`);
      }

      // Persist changes
      const updatedOrder = await this.orderRepository.update(existingOrder);

      this.logger.log(`✅ Updated order: ${orderNumber}`);
      return this.toResponseDto(updatedOrder);
    } catch (error) {
      this.logger.error(`❌ Failed to update order ${orderNumber}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Delete order
   * Business Rules:
   * - Order must exist
   * - Cannot delete delivered orders
   * - Pet status must be restored to available
   */
  async deleteOrder(orderNumber: string): Promise<void> {
    try {
      this.logger.debug(`Deleting order: ${orderNumber}`);

      // Check if order exists
      const existingOrder = await this.orderRepository.findByOrderNumber(orderNumber);
      if (!existingOrder) {
        throw new NotFoundException(`Order with number ${orderNumber} not found`);
      }

      // Business rule: Cannot delete delivered orders
      if (existingOrder.status === 'delivered') {
        throw new ConflictException(`Cannot delete delivered order ${orderNumber}`);
      }

      // Restore pet availability if order is not delivered
      const pet = await this.petRepository.findById(existingOrder.petId);
      if (pet && pet.status === 'pending') {
        pet.markAsAvailable();
        await this.petRepository.update(pet);
      }

      // Delete the order
      const deleted = await this.orderRepository.delete(orderNumber);
      if (!deleted) {
        throw new NotFoundException(`Order with number ${orderNumber} not found for deletion`);
      }

      this.logger.log(`✅ Deleted order: ${orderNumber}`);
    } catch (error) {
      this.logger.error(`❌ Failed to delete order ${orderNumber}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get orders by customer ID
   */
  async getOrdersByCustomerId(customerId: string): Promise<OrderResponseDto[]> {
    try {
      this.logger.debug(`Getting orders by customer ID: ${customerId}`);

      const orders = await this.orderRepository.findByCustomerId(customerId);
      const response = orders.map(order => this.toResponseDto(order));

      this.logger.debug(`✅ Found ${orders.length} orders for customer: ${customerId}`);
      return response;
    } catch (error) {
      this.logger.error(`❌ Failed to get orders by customer ${customerId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get orders by status
   */
  async getOrdersByStatus(status: OrderStatus): Promise<OrderResponseDto[]> {
    try {
      this.logger.debug(`Getting orders by status: ${status}`);

      const orders = await this.orderRepository.findByStatus(status);
      const response = orders.map(order => this.toResponseDto(order));

      this.logger.debug(`✅ Found ${orders.length} orders with status: ${status}`);
      return response;
    } catch (error) {
      this.logger.error(`❌ Failed to get orders by status: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get orders by pet ID
   */
  async getOrdersByPetId(petId: string): Promise<OrderResponseDto[]> {
    try {
      this.logger.debug(`Getting orders by pet ID: ${petId}`);

      const orders = await this.orderRepository.findByPetId(petId);
      const response = orders.map(order => this.toResponseDto(order));

      this.logger.debug(`✅ Found ${orders.length} orders for pet: ${petId}`);
      return response;
    } catch (error) {
      this.logger.error(`❌ Failed to get orders by pet ${petId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get orders by date range
   */
  async getOrdersByDateRange(startDate: Date, endDate: Date): Promise<OrderResponseDto[]> {
    try {
      this.logger.debug(`Getting orders by date range: ${startDate.toISOString()} - ${endDate.toISOString()}`);

      const orders = await this.orderRepository.findByDateRange(startDate, endDate);
      const response = orders.map(order => this.toResponseDto(order));

      this.logger.debug(`✅ Found ${orders.length} orders in date range`);
      return response;
    } catch (error) {
      this.logger.error(`❌ Failed to get orders by date range: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Approve order
   */
  async approveOrder(orderNumber: string): Promise<OrderResponseDto> {
    try {
      this.logger.debug(`Approving order: ${orderNumber}`);

      const order = await this.orderRepository.findByOrderNumber(orderNumber);
      if (!order) {
        throw new NotFoundException(`Order with number ${orderNumber} not found`);
      }

      if (order.status !== 'placed') {
        throw new ConflictException(`Order ${orderNumber} is not in placed status and cannot be approved`);
      }

      order.approve();
      const updatedOrder = await this.orderRepository.update(order);

      this.logger.log(`✅ Approved order: ${orderNumber}`);
      return this.toResponseDto(updatedOrder);
    } catch (error) {
      this.logger.error(`❌ Failed to approve order ${orderNumber}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Mark order as delivered
   */
  async deliverOrder(orderNumber: string): Promise<OrderResponseDto> {
    try {
      this.logger.debug(`Marking order as delivered: ${orderNumber}`);

      const order = await this.orderRepository.findByOrderNumber(orderNumber);
      if (!order) {
        throw new NotFoundException(`Order with number ${orderNumber} not found`);
      }

      if (order.status !== 'approved') {
        throw new ConflictException(`Order ${orderNumber} is not in approved status and cannot be delivered`);
      }

      // Mark pet as sold
      const pet = await this.petRepository.findById(order.petId);
      if (pet) {
        pet.markAsSold();
        await this.petRepository.update(pet);
      }

      order.markAsDelivered();
      const updatedOrder = await this.orderRepository.update(order);

      this.logger.log(`✅ Delivered order: ${orderNumber}`);
      return this.toResponseDto(updatedOrder);
    } catch (error) {
      this.logger.error(`❌ Failed to deliver order ${orderNumber}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderNumber: string): Promise<OrderResponseDto> {
    try {
      this.logger.debug(`Cancelling order: ${orderNumber}`);

      const order = await this.orderRepository.findByOrderNumber(orderNumber);
      if (!order) {
        throw new NotFoundException(`Order with number ${orderNumber} not found`);
      }

      if (order.status === 'delivered' || order.status === 'cancelled') {
        throw new ConflictException(`Order ${orderNumber} cannot be cancelled`);
      }

      // Restore pet availability
      const pet = await this.petRepository.findById(order.petId);
      if (pet && pet.status === 'pending') {
        pet.markAsAvailable();
        await this.petRepository.update(pet);
      }

      order.cancel();
      const updatedOrder = await this.orderRepository.update(order);

      this.logger.log(`✅ Cancelled order: ${orderNumber}`);
      return this.toResponseDto(updatedOrder);
    } catch (error) {
      this.logger.error(`❌ Failed to cancel order ${orderNumber}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderNumber: string, status: OrderStatus): Promise<OrderResponseDto> {
    try {
      this.logger.debug(`Updating order status: ${orderNumber} -> ${status}`);

      const order = await this.orderRepository.findByOrderNumber(orderNumber);
      if (!order) {
        throw new NotFoundException(`Order with number ${orderNumber} not found`);
      }

      order.updateStatus(status);
      const updatedOrder = await this.orderRepository.update(order);

      this.logger.log(`✅ Updated order status: ${orderNumber} -> ${status}`);
      return this.toResponseDto(updatedOrder);
    } catch (error) {
      this.logger.error(`❌ Failed to update order status ${orderNumber}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get order count
   */
  async getOrderCount(): Promise<number> {
    try {
      this.logger.debug('Getting total order count');

      const count = await this.orderRepository.count();

      this.logger.debug(`✅ Total order count: ${count}`);
      return count;
    } catch (error) {
      this.logger.error(`❌ Failed to get order count: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get order statistics
   */
  async getOrderStatistics(): Promise<OrderStatsResponseDto> {
    try {
      this.logger.debug('Getting order statistics');

      const allOrders = await this.orderRepository.findAll();
      
      const byStatus = {
        placed: 0,
        approved: 0,
        delivered: 0,
        cancelled: 0,
      } as Record<OrderStatus, number>;

      let totalRevenue = 0;

      allOrders.forEach(order => {
        byStatus[order.status]++;
        if (order.status === 'delivered') {
          totalRevenue += order.totalAmount;
        }
      });

      const averageOrderValue = allOrders.length > 0 ? totalRevenue / allOrders.length : 0;

      const stats = new OrderStatsResponseDto({
        totalOrders: allOrders.length,
        totalRevenue,
        ordersByStatus: byStatus,
        averageOrderValue,
      });

      this.logger.debug(`✅ Order statistics calculated`);
      return stats;
    } catch (error) {
      this.logger.error(`❌ Failed to get order statistics: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Search orders with multiple filters
   */
  async searchOrdersWithFilters(filters: {
    storeId?: string;
    customerId?: string;
    status?: OrderStatus;
    petId?: string;
    startDate?: Date;
    endDate?: Date;
    minAmount?: number;
    maxAmount?: number;
  }): Promise<OrderResponseDto[]> {
    try {
      this.logger.debug('Searching orders with filters:', filters);

      const orders = await this.orderRepository.findWithFilters(filters);
      const response = orders.map(order => this.toResponseDto(order));

      this.logger.debug(`✅ Found ${orders.length} orders matching filters`);
      return response;
    } catch (error) {
      this.logger.error(`❌ Failed to search orders with filters: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Generate unique order ID
   */
  private generateOrderId(): string {
    const timestamp = Date.now();
    return `order-${timestamp}`;
  }

  /**
   * Convert domain entity to response DTO
   */
  private toResponseDto(order: Order): OrderResponseDto {
    return new OrderResponseDto({
      orderNumber: order.orderNumber,
      petId: order.petId,
      customerId: order.customerId,
      quantity: order.quantity,
      status: order.status,
      orderDate: order.orderDate,
      totalAmount: order.totalAmount,
      storeId: order.storeId,
      notes: order.notes,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      deliveryAddress: order.deliveryAddress,
      deliveryDate: order.deliveryDate,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    });
  }
}