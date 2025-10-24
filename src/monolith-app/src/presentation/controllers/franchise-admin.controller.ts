/**
 * Franchise Admin Controller
 * 
 * Handles administrative operations for franchise management.
 * Provides REST API endpoints for franchise CRUD operations
 * following the OpenAPI specification.
 * 
 * Security: API Key authentication required (x-api-key header)
 * Base Path: /admin/franchise
 * 
 * Endpoints:
 * - GET /admin/franchise - List all franchises
 * - POST /admin/franchise - Create new franchise
 * - PUT /admin/franchise - Update franchise
 * - GET /admin/franchise/{id} - Get franchises by ID (query)
 * - GET /admin/franchise/object/{id} - Get specific franchise (item)
 * - DELETE /admin/franchise/object/{id} - Delete franchise
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
import { FranchiseService } from '../../application/services/franchise.service';
import { CreateFranchiseDto, UpdateFranchiseDto, FranchiseResponseDto } from '../../application/dtos/franchise.dto';
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

@ApiTags('Admin - Franchises')
@Controller('admin/franchise')
@ApiSecurity('ApiKeyAuth')
@UseGuards(ApiKeyGuard)
export class FranchiseAdminController {
  private readonly logger = new Logger(FranchiseAdminController.name);

  constructor(private readonly franchiseService: FranchiseService) {
    this.logger.log('🏢 Franchise Admin Controller initialized');
  }

  /**
   * List all franchises
   * GET /admin/franchise
   */
  @Get()
  @ApiOperation({
    summary: 'List all franchises',
    description: 'Retrieve a list of all franchises in the system. Returns array of franchise items.',
    operationId: 'listFranchises',
  })
  @ApiResponse({
    status: 200,
    description: 'Successful response with franchise list',
    type: [FranchiseResponseDto],
    example: [
      {
        id: 'franchise-001',
        name: 'Pet Paradise Downtown',
        location: 'New York, NY',
        stores: ['store-001', 'store-002'],
      },
    ],
  })
  @ApiBadRequestResponse({ description: 'Bad Request', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiInternalServerErrorResponse({ description: 'Server Error', type: ErrorResponse })
  async listFranchises(): Promise<FranchiseResponseDto[]> {
    try {
      this.logger.debug('📋 Listing all franchises');
      const result = await this.franchiseService.getAllFranchises();
      this.logger.log(`✅ Retrieved ${result.franchises.length} franchises`);
      return result.franchises;
    } catch (error) {
      this.logger.error(`❌ Failed to list franchises: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Create a new franchise
   * POST /admin/franchise
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new franchise',
    description: 'Create a new franchise in the system',
    operationId: 'createFranchise',
  })
  @ApiBody({
    type: CreateFranchiseDto,
    description: 'Franchise data',
    examples: {
      example1: {
        summary: 'New franchise example',
        value: {
          id: 'franchise-003',
          name: 'Pet Paradise Uptown',
          location: 'Boston, MA',
          stores: ['store-005'],
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Franchise created successfully',
    type: SuccessResponse,
    example: {
      success: 'post call succeed!',
      url: '/admin/franchise',
      data: {},
    },
  })
  @ApiBadRequestResponse({ description: 'Bad Request', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiInternalServerErrorResponse({ description: 'Server Error', type: ErrorResponse })
  async createFranchise(@Body() createDto: CreateFranchiseDto): Promise<SuccessResponse> {
    try {
      this.logger.debug(`🆕 Creating franchise: ${createDto.name}`);
      
      await this.franchiseService.createFranchise(createDto);
      
      const response: SuccessResponse = {
        success: 'post call succeed!',
        url: '/admin/franchise',
        data: {},
      };
      
      this.logger.log(`✅ Created franchise: ${createDto.id}`);
      return response;
    } catch (error) {
      this.logger.error(`❌ Failed to create franchise: ${error.message}`, error.stack);
      
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
   * Update a franchise
   * PUT /admin/franchise
   */
  @Put()
  @ApiOperation({
    summary: 'Update a franchise',
    description: "Update an existing franchise's information",
    operationId: 'updateFranchise',
  })
  @ApiBody({
    type: UpdateFranchiseDto,
    description: 'Updated franchise data',
    examples: {
      example1: {
        summary: 'Update franchise example',
        value: {
          id: 'franchise-001',
          name: 'Pet Paradise Downtown Updated',
          location: 'Manhattan, NYC',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Franchise updated successfully',
    type: SuccessResponse,
    example: {
      success: 'put call succeed!',
      url: '/admin/franchise',
      data: {},
    },
  })
  @ApiBadRequestResponse({ description: 'Bad Request', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Not Found', type: ErrorResponse })
  @ApiInternalServerErrorResponse({ description: 'Server Error', type: ErrorResponse })
  async updateFranchise(@Body() updateDto: UpdateFranchiseDto): Promise<SuccessResponse> {
    try {
      this.logger.debug(`🔄 Updating franchise: ${updateDto.id}`);
      
      if (!updateDto.id) {
        throw new BadRequestException('Franchise ID is required for update');
      }
      
      await this.franchiseService.updateFranchise(updateDto.id, updateDto);
      
      const response: SuccessResponse = {
        success: 'put call succeed!',
        url: '/admin/franchise',
        data: {},
      };
      
      this.logger.log(`✅ Updated franchise: ${updateDto.id}`);
      return response;
    } catch (error) {
      this.logger.error(`❌ Failed to update franchise: ${error.message}`, error.stack);
      
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
   * Get franchises by ID (Query operation)
   * GET /admin/franchise/{id}
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get franchises by ID',
    description: 'Retrieve franchises with the specified ID using DynamoDB query',
    operationId: 'getFranchisesByID',
  })
  @ApiParam({
    name: 'id',
    description: 'Franchise ID to query',
    example: 'franchise-001',
  })
  @ApiResponse({
    status: 200,
    description: 'Successful response with matching franchises',
    type: [FranchiseResponseDto],
  })
  @ApiBadRequestResponse({ description: 'Bad Request', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiInternalServerErrorResponse({ description: 'Server Error', type: ErrorResponse })
  async getFranchisesByID(@Param('id') id: string): Promise<FranchiseResponseDto[]> {
    try {
      this.logger.debug(`🔍 Querying franchises by ID: ${id}`);
      
      // For query operation, we search for franchises that match the ID pattern
      const franchises = await this.franchiseService.searchFranchisesByName(id);
      
      this.logger.log(`✅ Found ${franchises.length} franchises matching ID: ${id}`);
      return franchises;
    } catch (error) {
      this.logger.error(`❌ Failed to query franchises by ID ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get a specific franchise (GetItem operation)
   * GET /admin/franchise/object/{id}
   */
  @Get('object/:id')
  @ApiOperation({
    summary: 'Get a specific franchise',
    description: 'Retrieve a single franchise by ID using DynamoDB GetItem',
    operationId: 'getFranchise',
  })
  @ApiParam({
    name: 'id',
    description: 'Franchise ID',
    example: 'franchise-001',
  })
  @ApiResponse({
    status: 200,
    description: 'Successful response with franchise details',
    type: FranchiseResponseDto,
    example: {
      id: 'franchise-001',
      name: 'Pet Paradise Downtown',
      location: 'New York, NY',
    },
  })
  @ApiBadRequestResponse({ description: 'Bad Request', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Not Found', type: ErrorResponse })
  @ApiInternalServerErrorResponse({ description: 'Server Error', type: ErrorResponse })
  async getFranchise(@Param('id') id: string): Promise<FranchiseResponseDto> {
    try {
      this.logger.debug(`🔍 Getting franchise by ID: ${id}`);
      
      const franchise = await this.franchiseService.getFranchiseById(id);
      
      this.logger.log(`✅ Retrieved franchise: ${id}`);
      return franchise;
    } catch (error) {
      this.logger.error(`❌ Failed to get franchise ${id}: ${error.message}`, error.stack);
      
      if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  /**
   * Delete a franchise
   * DELETE /admin/franchise/object/{id}
   */
  @Delete('object/:id')
  @ApiOperation({
    summary: 'Delete a franchise',
    description: 'Delete a franchise from the system permanently',
    operationId: 'deleteFranchise',
  })
  @ApiParam({
    name: 'id',
    description: 'Franchise ID to delete',
    example: 'franchise-001',
  })
  @ApiResponse({
    status: 200,
    description: 'Franchise deleted successfully',
    type: DeleteResponse,
    example: {
      url: '/admin/franchise/object/franchise-001',
      data: {},
    },
  })
  @ApiBadRequestResponse({ description: 'Bad Request', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Not Found', type: ErrorResponse })
  @ApiInternalServerErrorResponse({ description: 'Server Error', type: ErrorResponse })
  async deleteFranchise(@Param('id') id: string): Promise<DeleteResponse> {
    try {
      this.logger.debug(`🗑️ Deleting franchise: ${id}`);
      
      await this.franchiseService.deleteFranchise(id);
      
      const response: DeleteResponse = {
        url: `/admin/franchise/object/${id}`,
        data: {},
      };
      
      this.logger.log(`✅ Deleted franchise: ${id}`);
      return response;
    } catch (error) {
      this.logger.error(`❌ Failed to delete franchise ${id}: ${error.message}`, error.stack);
      
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