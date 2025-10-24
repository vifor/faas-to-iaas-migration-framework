/**
 * Order Store Controller
 * 
 * Handles order management operations within stores.
 * Provides REST API endpoints for store-level order operations
 * following the OpenAPI specification.
 * 
 * Security: JWT Bearer token authentication required
 * Base Path: /store/{storeId}/order
 * 
 * Endpoints:
 * - GET /store/{storeId}/orders - List orders in store
 * - POST /store/{storeId}/order/create - Create new order
 * - GET /store/{storeId}/order/get/{orderNumber} - Get specific order
 * - DELETE /store/{storeId}/order/cancel/{orderNumber} - Cancel order
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpCode,
  UseGuards,
  Logger,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiSecurity,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { OrderService } from '../../application/services/order.service';
import { CreateOrderDto, UpdateOrderDto, OrderResponseDto } from '../../application/dtos/order.dto';
import { OrderStatus } from '../../domain/entities/order.entity';
import { JwtAuthGuard } from '../guards';

// Response DTOs for OpenAPI specification
class OrderListResponse {
  orders: OrderResponseDto[];
  total: number;
  storeId: string;
}

class SuccessResponse {
  success: string;
  url: string;
  data: any;
}

class CancelResponse {
  message: string;
  orderNumber: string;
  status: string;
}

class ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
}

@ApiTags('Store Operations - Orders')
@Controller('store/:storeId/order')
@ApiSecurity('BearerAuth')
@UseGuards(JwtAuthGuard)
export class OrderStoreController {
  private readonly logger = new Logger(OrderStoreController.name);

  constructor(private readonly orderService: OrderService) {
    this.logger.log('📦 Order Store Controller initialized');
  }

  /**
   * List orders in store
   * GET /store/{storeId}/orders
   */
  @Get('s') // Note: 's' to match '/orders' from the route
  @ApiOperation({
    summary: 'List orders in store',
    description: 'Retrieve a list of orders for the specified store with optional filtering.',
    operationId: 'listStoreOrders',
  })
  @ApiParam({
    name: 'storeId',
    description: 'Store ID to get orders from',
    example: 'store-001',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by order status',
    enum: ['placed', 'approved', 'delivered', 'cancelled'],
  })
  @ApiQuery({
    name: 'customerId',
    required: false,
    description: 'Filter by customer ID',
    type: String,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Maximum number of orders to return',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Successful response with order list',
    type: OrderListResponse,
    example: {
      orders: [
        {
          orderNumber: 'order-001',
          petId: 'pet-001',
          customerId: 'customer-001',
          status: 'placed',
          totalAmount: 500,
          orderDate: '2023-10-24T10:00:00Z',
        },
      ],
      total: 1,
      storeId: 'store-001',
    },
  })
  @ApiBadRequestResponse({ description: 'Bad Request', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiInternalServerErrorResponse({ description: 'Server Error', type: ErrorResponse })
  async listStoreOrders(
    @Param('storeId') storeId: string,
    @Query('status') status?: OrderStatus,
    @Query('customerId') customerId?: string,
    @Query('limit') limit?: number,
  ): Promise<OrderListResponse> {
    try {
      this.logger.debug(`📋 Listing orders for store: ${storeId}`);
      
      const result = await this.orderService.getAllOrders(status, customerId, limit);
      
      // Filter orders by store ID
      const storeOrders = result.orders.filter(order => order.storeId === storeId);
      
      const response: OrderListResponse = {
        orders: storeOrders,
        total: storeOrders.length,
        storeId,
      };
      
      this.logger.log(`✅ Retrieved ${storeOrders.length} orders for store: ${storeId}`);
      return response;
    } catch (error) {
      this.logger.error(`❌ Failed to list orders for store ${storeId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Create new order
   * POST /store/{storeId}/order/create
   */
  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new order',
    description: 'Place a new order in the store',
    operationId: 'createStoreOrder',
  })
  @ApiParam({
    name: 'storeId',
    description: 'Store ID to place order in',
    example: 'store-001',
  })
  @ApiBody({
    type: CreateOrderDto,
    description: 'Order data',
    examples: {
      example1: {
        summary: 'New order example',
        value: {
          petId: 'pet-001',
          customerId: 'customer-001',
          quantity: 1,
          customerName: 'John Doe',
          customerEmail: 'john.doe@example.com',
          customerPhone: '+1234567890',
          deliveryAddress: '123 Main St, New York, NY',
          notes: 'Please call before delivery',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Order created successfully',
    type: SuccessResponse,
    example: {
      success: 'Order created successfully',
      url: '/store/store-001/order/create',
      data: {
        orderNumber: 'order-12345',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Bad Request', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiInternalServerErrorResponse({ description: 'Server Error', type: ErrorResponse })
  async createStoreOrder(
    @Param('storeId') storeId: string,
    @Body() createDto: CreateOrderDto,
  ): Promise<SuccessResponse> {
    try {
      this.logger.debug(`🆕 Creating order in store: ${storeId}`);
      
      const order = await this.orderService.createOrder(createDto, storeId);
      
      const response: SuccessResponse = {
        success: 'Order created successfully',
        url: `/store/${storeId}/order/create`,
        data: {
          orderNumber: order.orderNumber,
        },
      };
      
      this.logger.log(`✅ Created order ${order.orderNumber} in store: ${storeId}`);
      return response;
    } catch (error) {
      this.logger.error(`❌ Failed to create order in store ${storeId}: ${error.message}`, error.stack);
      
      if (error instanceof ConflictException) {
        throw new ConflictException(error.message);
      }
      if (error instanceof BadRequestException) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  /**
   * Get specific order
   * GET /store/{storeId}/order/get/{orderNumber}
   */
  @Get('get/:orderNumber')
  @ApiOperation({
    summary: 'Get a specific order',
    description: 'Retrieve detailed information about a specific order in the store',
    operationId: 'getStoreOrder',
  })
  @ApiParam({
    name: 'storeId',
    description: 'Store ID containing the order',
    example: 'store-001',
  })
  @ApiParam({
    name: 'orderNumber',
    description: 'Order number to retrieve',
    example: 'order-001',
  })
  @ApiResponse({
    status: 200,
    description: 'Successful response with order details',
    type: OrderResponseDto,
    example: {
      orderNumber: 'order-001',
      petId: 'pet-001',
      customerId: 'customer-001',
      quantity: 1,
      status: 'placed',
      totalAmount: 500,
      storeId: 'store-001',
      orderDate: '2023-10-24T10:00:00Z',
    },
  })
  @ApiBadRequestResponse({ description: 'Bad Request', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Not Found', type: ErrorResponse })
  @ApiInternalServerErrorResponse({ description: 'Server Error', type: ErrorResponse })
  async getStoreOrder(
    @Param('storeId') storeId: string,
    @Param('orderNumber') orderNumber: string,
  ): Promise<OrderResponseDto> {
    try {
      this.logger.debug(`🔍 Getting order ${orderNumber} from store: ${storeId}`);
      
      const order = await this.orderService.getOrderByNumber(orderNumber);
      
      // Verify order belongs to the specified store
      if (order.storeId !== storeId) {
        throw new NotFoundException(`Order ${orderNumber} not found in store ${storeId}`);
      }
      
      this.logger.log(`✅ Retrieved order ${orderNumber} from store: ${storeId}`);
      return order;
    } catch (error) {
      this.logger.error(`❌ Failed to get order ${orderNumber} from store ${storeId}: ${error.message}`, error.stack);
      
      if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  /**
   * Cancel order
   * DELETE /store/{storeId}/order/cancel/{orderNumber}
   */
  @Delete('cancel/:orderNumber')
  @ApiOperation({
    summary: 'Cancel an order',
    description: 'Cancel a specific order in the store',
    operationId: 'cancelStoreOrder',
  })
  @ApiParam({
    name: 'storeId',
    description: 'Store ID containing the order',
    example: 'store-001',
  })
  @ApiParam({
    name: 'orderNumber',
    description: 'Order number to cancel',
    example: 'order-001',
  })
  @ApiResponse({
    status: 200,
    description: 'Order cancelled successfully',
    type: CancelResponse,
    example: {
      message: 'Order cancelled successfully',
      orderNumber: 'order-001',
      status: 'cancelled',
    },
  })
  @ApiBadRequestResponse({ description: 'Bad Request', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Not Found', type: ErrorResponse })
  @ApiInternalServerErrorResponse({ description: 'Server Error', type: ErrorResponse })
  async cancelStoreOrder(
    @Param('storeId') storeId: string,
    @Param('orderNumber') orderNumber: string,
  ): Promise<CancelResponse> {
    try {
      this.logger.debug(`❌ Cancelling order ${orderNumber} in store: ${storeId}`);
      
      // Verify order belongs to the specified store
      const existingOrder = await this.orderService.getOrderByNumber(orderNumber);
      if (existingOrder.storeId !== storeId) {
        throw new NotFoundException(`Order ${orderNumber} not found in store ${storeId}`);
      }
      
      const cancelledOrder = await this.orderService.cancelOrder(orderNumber);
      
      const response: CancelResponse = {
        message: 'Order cancelled successfully',
        orderNumber,
        status: cancelledOrder.status,
      };
      
      this.logger.log(`✅ Cancelled order ${orderNumber} in store: ${storeId}`);
      return response;
    } catch (error) {
      this.logger.error(`❌ Failed to cancel order ${orderNumber} in store ${storeId}: ${error.message}`, error.stack);
      
      if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof ConflictException) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }
}