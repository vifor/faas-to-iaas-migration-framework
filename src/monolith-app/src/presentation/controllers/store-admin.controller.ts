/**
 * Store Admin Controller
 * 
 * Handles administrative operations for store management.
 * Provides REST API endpoints for store CRUD operations
 * following the OpenAPI specification.
 * 
 * Security: API Key authentication required (x-api-key header)
 * Base Path: /admin/store
 * 
 * Endpoints:
 * - GET /admin/store - List all stores
 * - POST /admin/store - Create new store
 * - PUT /admin/store - Update store
 * - GET /admin/store/{id}/{value} - Get stores by composite key (query)
 * - GET /admin/store/object/{id}/{value} - Get specific store (item)
 * - DELETE /admin/store/object/{id}/{value} - Delete store
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
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
  ApiBody,
  ApiSecurity,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { StoreService } from '../../application/services/store.service';
import { CreateStoreDto, UpdateStoreDto, StoreResponseDto } from '../../application/dtos/store.dto';
import { ApiKeyGuard } from '../guards';

// Response DTOs for OpenAPI specification
class SuccessResponse {
  success: string;
  url: string;
  data: any;
}

class DeleteResponse {
  url: string;
  data: any;
}

class ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
}

@ApiTags('Admin - Stores')
@Controller('admin/store')
@ApiSecurity('ApiKeyAuth')
@UseGuards(ApiKeyGuard)
export class StoreAdminController {
  private readonly logger = new Logger(StoreAdminController.name);

  constructor(private readonly storeService: StoreService) {
    this.logger.log('🏪 Store Admin Controller initialized');
  }

  /**
   * List all stores
   * GET /admin/store
   */
  @Get()
  @ApiOperation({
    summary: 'List all stores',
    description: 'Retrieve a list of all stores in the system. Returns array of store items.',
    operationId: 'listStores',
  })
  @ApiResponse({
    status: 200,
    description: 'Successful response with store list',
    type: [StoreResponseDto],
    example: [
      {
        id: 'store-001',
        value: 'main',
        name: 'Downtown Pet Store',
        address: '123 Main St, New York, NY',
      },
    ],
  })
  @ApiBadRequestResponse({ description: 'Bad Request', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiInternalServerErrorResponse({ description: 'Server Error', type: ErrorResponse })
  async listStores(): Promise<StoreResponseDto[]> {
    try {
      this.logger.debug('📋 Listing all stores');
      const result = await this.storeService.getAllStores();
      this.logger.log(`✅ Retrieved ${result.stores.length} stores`);
      return result.stores;
    } catch (error) {
      this.logger.error(`❌ Failed to list stores: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Create a new store
   * POST /admin/store
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new store',
    description: 'Create a new store in the system',
    operationId: 'createStore',
  })
  @ApiBody({
    type: CreateStoreDto,
    description: 'Store data',
    examples: {
      example1: {
        summary: 'New store example',
        value: {
          id: 'store-003',
          value: 'branch',
          name: 'Uptown Pet Store',
          address: '456 Oak Ave, Boston, MA',
          franchiseId: 'franchise-001',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Store created successfully',
    type: SuccessResponse,
    example: {
      success: 'post call succeed!',
      url: '/admin/store',
      data: {},
    },
  })
  @ApiBadRequestResponse({ description: 'Bad Request', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiInternalServerErrorResponse({ description: 'Server Error', type: ErrorResponse })
  async createStore(@Body() createDto: CreateStoreDto): Promise<SuccessResponse> {
    try {
      this.logger.debug(`🆕 Creating store: ${createDto.name}`);
      
      await this.storeService.createStore(createDto);
      
      const response: SuccessResponse = {
        success: 'post call succeed!',
        url: '/admin/store',
        data: {},
      };
      
      this.logger.log(`✅ Created store: ${createDto.id}-${createDto.value}`);
      return response;
    } catch (error) {
      this.logger.error(`❌ Failed to create store: ${error.message}`, error.stack);
      
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
   * Update a store
   * PUT /admin/store
   */
  @Put()
  @ApiOperation({
    summary: 'Update a store',
    description: "Update an existing store's information",
    operationId: 'updateStore',
  })
  @ApiBody({
    type: UpdateStoreDto,
    description: 'Updated store data',
    examples: {
      example1: {
        summary: 'Update store example',
        value: {
          id: 'store-001',
          value: 'main',
          name: 'Downtown Pet Store Updated',
          address: '123 Main St, Manhattan, NYC',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Store updated successfully',
    type: SuccessResponse,
    example: {
      success: 'put call succeed!',
      url: '/admin/store',
      data: {},
    },
  })
  @ApiBadRequestResponse({ description: 'Bad Request', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Not Found', type: ErrorResponse })
  @ApiInternalServerErrorResponse({ description: 'Server Error', type: ErrorResponse })
  async updateStore(@Body() updateDto: UpdateStoreDto): Promise<SuccessResponse> {
    try {
      this.logger.debug(`🔄 Updating store: ${updateDto.id}-${updateDto.value}`);
      
      if (!updateDto.id || !updateDto.value) {
        throw new BadRequestException('Store ID and value are required for update');
      }
      
      await this.storeService.updateStore(updateDto.id, updateDto.value, updateDto);
      
      const response: SuccessResponse = {
        success: 'put call succeed!',
        url: '/admin/store',
        data: {},
      };
      
      this.logger.log(`✅ Updated store: ${updateDto.id}-${updateDto.value}`);
      return response;
    } catch (error) {
      this.logger.error(`❌ Failed to update store: ${error.message}`, error.stack);
      
      if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof BadRequestException) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  /**
   * Get stores by composite key (Query operation)
   * GET /admin/store/{id}/{value}
   */
  @Get(':id/:value')
  @ApiOperation({
    summary: 'Get stores by composite key',
    description: 'Retrieve stores with the specified composite key using DynamoDB query',
    operationId: 'getStoresByCompositeKey',
  })
  @ApiParam({
    name: 'id',
    description: 'Store ID (partition key)',
    example: 'store-001',
  })
  @ApiParam({
    name: 'value',
    description: 'Store value (sort key)',
    example: 'main',
  })
  @ApiResponse({
    status: 200,
    description: 'Successful response with matching stores',
    type: [StoreResponseDto],
  })
  @ApiBadRequestResponse({ description: 'Bad Request', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiInternalServerErrorResponse({ description: 'Server Error', type: ErrorResponse })
  async getStoresByCompositeKey(
    @Param('id') id: string,
    @Param('value') value: string,
  ): Promise<StoreResponseDto[]> {
    try {
      this.logger.debug(`🔍 Querying stores by composite key: ${id}-${value}`);
      
      // For query operation, we search for stores that match the composite key pattern
      const stores = await this.storeService.getStoresByIdQuery(id); // Using ID query search
      
      this.logger.log(`✅ Found ${stores.length} stores matching composite key: ${id}-${value}`);
      return stores;
    } catch (error) {
      this.logger.error(`❌ Failed to query stores by composite key ${id}-${value}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get a specific store (GetItem operation)
   * GET /admin/store/object/{id}/{value}
   */
  @Get('object/:id/:value')
  @ApiOperation({
    summary: 'Get a specific store',
    description: 'Retrieve a single store by composite key using DynamoDB GetItem',
    operationId: 'getStore',
  })
  @ApiParam({
    name: 'id',
    description: 'Store ID (partition key)',
    example: 'store-001',
  })
  @ApiParam({
    name: 'value',
    description: 'Store value (sort key)',
    example: 'main',
  })
  @ApiResponse({
    status: 200,
    description: 'Successful response with store details',
    type: StoreResponseDto,
    example: {
      id: 'store-001',
      value: 'main',
      name: 'Downtown Pet Store',
      address: '123 Main St, New York, NY 10001',
    },
  })
  @ApiBadRequestResponse({ description: 'Bad Request', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Not Found', type: ErrorResponse })
  @ApiInternalServerErrorResponse({ description: 'Server Error', type: ErrorResponse })
  async getStore(
    @Param('id') id: string,
    @Param('value') value: string,
  ): Promise<StoreResponseDto> {
    try {
      this.logger.debug(`🔍 Getting store by composite key: ${id}-${value}`);
      
      const store = await this.storeService.getStoreByCompositeKey(id, value);
      
      this.logger.log(`✅ Retrieved store: ${id}-${value}`);
      return store;
    } catch (error) {
      this.logger.error(`❌ Failed to get store ${id}-${value}: ${error.message}`, error.stack);
      
      if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  /**
   * Delete a store
   * DELETE /admin/store/object/{id}/{value}
   */
  @Delete('object/:id/:value')
  @ApiOperation({
    summary: 'Delete a store',
    description: 'Delete a store from the system permanently',
    operationId: 'deleteStore',
  })
  @ApiParam({
    name: 'id',
    description: 'Store ID (partition key) to delete',
    example: 'store-001',
  })
  @ApiParam({
    name: 'value',
    description: 'Store value (sort key) to delete',
    example: 'main',
  })
  @ApiResponse({
    status: 200,
    description: 'Store deleted successfully',
    type: DeleteResponse,
    example: {
      url: '/admin/store/object/store-001/main',
      data: {},
    },
  })
  @ApiBadRequestResponse({ description: 'Bad Request', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Not Found', type: ErrorResponse })
  @ApiInternalServerErrorResponse({ description: 'Server Error', type: ErrorResponse })
  async deleteStore(
    @Param('id') id: string,
    @Param('value') value: string,
  ): Promise<DeleteResponse> {
    try {
      this.logger.debug(`🗑️ Deleting store: ${id}-${value}`);
      
      await this.storeService.deleteStore(id, value);
      
      const response: DeleteResponse = {
        url: `/admin/store/object/${id}/${value}`,
        data: {},
      };
      
      this.logger.log(`✅ Deleted store: ${id}-${value}`);
      return response;
    } catch (error) {
      this.logger.error(`❌ Failed to delete store ${id}-${value}: ${error.message}`, error.stack);
      
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