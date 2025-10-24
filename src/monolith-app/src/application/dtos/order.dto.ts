/**
 * Order Data Transfer Objects
 * 
 * DTOs for order-related API operations.
 * These objects handle serialization/deserialization and validation
 * for order endpoints following the OpenAPI specification.
 */

import { IsString, IsNotEmpty, IsNumber, IsPositive, IsOptional, IsEmail, IsIn } from 'class-validator';
import { OrderStatus } from '../../domain/entities/order.entity';

/**
 * DTO for creating a new order
 * Maps to OrderInput schema in OpenAPI spec
 */
export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  petId: string;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsString()
  @IsNotEmpty()
  customerId: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  deliveryAddress?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO for updating an existing order
 * Only certain fields can be updated after order creation
 */
export class UpdateOrderDto {
  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  deliveryAddress?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  @IsIn(['pending', 'paid', 'failed'])
  paymentStatus?: 'pending' | 'paid' | 'failed';
}

/**
 * DTO for order response
 * Maps to Order schema in OpenAPI spec
 */
export class OrderResponseDto {
  orderNumber: string;
  petId: string;
  customerId: string;
  quantity: number;
  status: OrderStatus;
  orderDate: string;
  totalAmount: number;
  storeId: string;
  notes?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  deliveryDate?: string;
  paymentMethod?: string;
  paymentStatus?: 'pending' | 'paid' | 'failed';
  createdAt: string;
  updatedAt: string;

  constructor(data: {
    orderNumber: string;
    petId: string;
    customerId: string;
    quantity: number;
    status: OrderStatus;
    orderDate: Date;
    totalAmount: number;
    storeId: string;
    notes?: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    deliveryAddress?: string;
    deliveryDate?: Date;
    paymentMethod?: string;
    paymentStatus?: 'pending' | 'paid' | 'failed';
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.orderNumber = data.orderNumber;
    this.petId = data.petId;
    this.customerId = data.customerId;
    this.quantity = data.quantity;
    this.status = data.status;
    this.orderDate = data.orderDate.toISOString();
    this.totalAmount = data.totalAmount;
    this.storeId = data.storeId;
    this.notes = data.notes;
    this.customerName = data.customerName;
    this.customerEmail = data.customerEmail;
    this.customerPhone = data.customerPhone;
    this.deliveryAddress = data.deliveryAddress;
    this.deliveryDate = data.deliveryDate?.toISOString();
    this.paymentMethod = data.paymentMethod;
    this.paymentStatus = data.paymentStatus;
    this.createdAt = data.createdAt.toISOString();
    this.updatedAt = data.updatedAt.toISOString();
  }
}

/**
 * DTO for order search filters
 * Used for filtering orders in search operations
 */
export class OrderSearchFiltersDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  @IsIn(['placed', 'approved', 'delivered', 'cancelled'])
  status?: OrderStatus;

  @IsOptional()
  @IsString()
  petId?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  minAmount?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  maxAmount?: number;
}

/**
 * DTO for order statistics response
 */
export class OrderStatsResponseDto {
  totalOrders: number;
  totalRevenue: number;
  ordersByStatus: Record<OrderStatus, number>;
  averageOrderValue: number;
  topCustomers?: Array<{
    customerId: string;
    orderCount: number;
    totalSpent: number;
  }>;

  constructor(data: {
    totalOrders: number;
    totalRevenue: number;
    ordersByStatus: Record<OrderStatus, number>;
    averageOrderValue: number;
    topCustomers?: Array<{
      customerId: string;
      orderCount: number;
      totalSpent: number;
    }>;
  }) {
    this.totalOrders = data.totalOrders;
    this.totalRevenue = data.totalRevenue;
    this.ordersByStatus = data.ordersByStatus;
    this.averageOrderValue = data.averageOrderValue;
    this.topCustomers = data.topCustomers;
  }
}