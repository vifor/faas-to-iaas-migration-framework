/**
 * Pet Store Controller
 * 
 * Handles pet management operations within stores.
 * Provides REST API endpoints for store-level pet operations
 * following the OpenAPI specification.
 * 
 * Security: JWT Bearer token authentication required
 * Base Path: /store/{storeId}/pet
 * 
 * Endpoints:
 * - GET /store/{storeId}/pets - List pets in store
 * - POST /store/{storeId}/pet/create - Create new pet in store
 * - GET /store/{storeId}/pet/get/{petId} - Get specific pet
 * - PUT /store/{storeId}/pet/update/{petId} - Update pet
 */

import {
  Controller,
  Get,
  Post,
  Put,
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
import { PetService } from '../../application/services/pet.service';
import { CreatePetDto, UpdatePetDto, PetResponseDto } from '../../application/dtos/pet.dto';
import { PetStatus, PetSpecies } from '../../domain/entities/pet.entity';
import { JwtAuthGuard } from '../guards';

// Response DTOs for OpenAPI specification
class PetListResponse {
  pets: PetResponseDto[];
  total: number;
  storeId: string;
}

class SuccessResponse {
  success: string;
  url: string;
  data: any;
}

class ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
}

@ApiTags('Store Operations - Pets')
@Controller('store/:storeId/pet')
@ApiSecurity('BearerAuth')
@UseGuards(JwtAuthGuard)
export class PetStoreController {
  private readonly logger = new Logger(PetStoreController.name);

  constructor(private readonly petService: PetService) {
    this.logger.log('🐾 Pet Store Controller initialized');
  }

  /**
   * List pets in store
   * GET /store/{storeId}/pets
   */
  @Get('s') // Note: 's' to match '/pets' from the route
  @ApiOperation({
    summary: 'List pets in store',
    description: 'Retrieve a list of pets available in the specified store with optional filtering.',
    operationId: 'listStorePets',
  })
  @ApiParam({
    name: 'storeId',
    description: 'Store ID to get pets from',
    example: 'store-001',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by pet status',
    enum: ['available', 'pending', 'sold'],
  })
  @ApiQuery({
    name: 'species',
    required: false,
    description: 'Filter by pet species',
    enum: ['Dog', 'Cat', 'Bird', 'Fish', 'Rabbit', 'Other'],
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Maximum number of pets to return',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Successful response with pet list',
    type: PetListResponse,
    example: {
      pets: [
        {
          id: 'pet-001',
          name: 'Buddy',
          species: 'Dog',
          breed: 'Golden Retriever',
          status: 'available',
          price: 500,
        },
      ],
      total: 1,
      storeId: 'store-001',
    },
  })
  @ApiBadRequestResponse({ description: 'Bad Request', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiInternalServerErrorResponse({ description: 'Server Error', type: ErrorResponse })
  async listStorePets(
    @Param('storeId') storeId: string,
    @Query('status') status?: PetStatus,
    @Query('species') species?: PetSpecies,
    @Query('limit') limit?: number,
  ): Promise<PetListResponse> {
    try {
      this.logger.debug(`📋 Listing pets for store: ${storeId}`);
      
      const result = await this.petService.getAllPets(storeId, status, species, limit);
      
      const response: PetListResponse = {
        pets: result.pets,
        total: result.pets.length,
        storeId,
      };
      
      this.logger.log(`✅ Retrieved ${result.pets.length} pets for store: ${storeId}`);
      return response;
    } catch (error) {
      this.logger.error(`❌ Failed to list pets for store ${storeId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Create new pet in store
   * POST /store/{storeId}/pet/create
   */
  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new pet',
    description: 'Add a new pet to the store inventory',
    operationId: 'createStorePet',
  })
  @ApiParam({
    name: 'storeId',
    description: 'Store ID to add pet to',
    example: 'store-001',
  })
  @ApiBody({
    type: CreatePetDto,
    description: 'Pet data',
    examples: {
      example1: {
        summary: 'New dog example',
        value: {
          name: 'Buddy',
          species: 'Dog',
          breed: 'Golden Retriever',
          age: 12,
          price: 500,
          description: 'Friendly and energetic dog',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Pet created successfully',
    type: SuccessResponse,
    example: {
      success: 'Pet created successfully',
      url: '/store/store-001/pet/create',
      data: {
        petId: 'pet-12345',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Bad Request', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiInternalServerErrorResponse({ description: 'Server Error', type: ErrorResponse })
  async createStorePet(
    @Param('storeId') storeId: string,
    @Body() createDto: CreatePetDto,
  ): Promise<SuccessResponse> {
    try {
      this.logger.debug(`🆕 Creating pet in store: ${storeId}`);
      
      const pet = await this.petService.createPet(createDto, storeId);
      
      const response: SuccessResponse = {
        success: 'Pet created successfully',
        url: `/store/${storeId}/pet/create`,
        data: {
          petId: pet.id,
        },
      };
      
      this.logger.log(`✅ Created pet ${pet.id} in store: ${storeId}`);
      return response;
    } catch (error) {
      this.logger.error(`❌ Failed to create pet in store ${storeId}: ${error.message}`, error.stack);
      
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
   * Get specific pet
   * GET /store/{storeId}/pet/get/{petId}
   */
  @Get('get/:petId')
  @ApiOperation({
    summary: 'Get a specific pet',
    description: 'Retrieve detailed information about a specific pet in the store',
    operationId: 'getStorePet',
  })
  @ApiParam({
    name: 'storeId',
    description: 'Store ID containing the pet',
    example: 'store-001',
  })
  @ApiParam({
    name: 'petId',
    description: 'Pet ID to retrieve',
    example: 'pet-001',
  })
  @ApiResponse({
    status: 200,
    description: 'Successful response with pet details',
    type: PetResponseDto,
    example: {
      id: 'pet-001',
      name: 'Buddy',
      species: 'Dog',
      breed: 'Golden Retriever',
      age: 12,
      price: 500,
      status: 'available',
      storeId: 'store-001',
    },
  })
  @ApiBadRequestResponse({ description: 'Bad Request', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Not Found', type: ErrorResponse })
  @ApiInternalServerErrorResponse({ description: 'Server Error', type: ErrorResponse })
  async getStorePet(
    @Param('storeId') storeId: string,
    @Param('petId') petId: string,
  ): Promise<PetResponseDto> {
    try {
      this.logger.debug(`🔍 Getting pet ${petId} from store: ${storeId}`);
      
      const pet = await this.petService.getPetById(petId);
      
      // Verify pet belongs to the specified store
      if (pet.storeId !== storeId) {
        throw new NotFoundException(`Pet ${petId} not found in store ${storeId}`);
      }
      
      this.logger.log(`✅ Retrieved pet ${petId} from store: ${storeId}`);
      return pet;
    } catch (error) {
      this.logger.error(`❌ Failed to get pet ${petId} from store ${storeId}: ${error.message}`, error.stack);
      
      if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  /**
   * Update pet
   * PUT /store/{storeId}/pet/update/{petId}
   */
  @Put('update/:petId')
  @ApiOperation({
    summary: 'Update a pet',
    description: 'Update information for a specific pet in the store',
    operationId: 'updateStorePet',
  })
  @ApiParam({
    name: 'storeId',
    description: 'Store ID containing the pet',
    example: 'store-001',
  })
  @ApiParam({
    name: 'petId',
    description: 'Pet ID to update',
    example: 'pet-001',
  })
  @ApiBody({
    type: UpdatePetDto,
    description: 'Updated pet data',
    examples: {
      example1: {
        summary: 'Update pet example',
        value: {
          name: 'Buddy Updated',
          price: 550,
          description: 'Very friendly and well-trained dog',
          status: 'available',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Pet updated successfully',
    type: SuccessResponse,
    example: {
      success: 'Pet updated successfully',
      url: '/store/store-001/pet/update/pet-001',
      data: {},
    },
  })
  @ApiBadRequestResponse({ description: 'Bad Request', type: ErrorResponse })
  @ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponse })
  @ApiNotFoundResponse({ description: 'Not Found', type: ErrorResponse })
  @ApiInternalServerErrorResponse({ description: 'Server Error', type: ErrorResponse })
  async updateStorePet(
    @Param('storeId') storeId: string,
    @Param('petId') petId: string,
    @Body() updateDto: UpdatePetDto,
  ): Promise<SuccessResponse> {
    try {
      this.logger.debug(`🔄 Updating pet ${petId} in store: ${storeId}`);
      
      // Verify pet belongs to the specified store
      const existingPet = await this.petService.getPetById(petId);
      if (existingPet.storeId !== storeId) {
        throw new NotFoundException(`Pet ${petId} not found in store ${storeId}`);
      }
      
      await this.petService.updatePet(petId, updateDto);
      
      const response: SuccessResponse = {
        success: 'Pet updated successfully',
        url: `/store/${storeId}/pet/update/${petId}`,
        data: {},
      };
      
      this.logger.log(`✅ Updated pet ${petId} in store: ${storeId}`);
      return response;
    } catch (error) {
      this.logger.error(`❌ Failed to update pet ${petId} in store ${storeId}: ${error.message}`, error.stack);
      
      if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof BadRequestException) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}