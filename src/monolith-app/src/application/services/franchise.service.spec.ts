import { Test, TestingModule } from '@nestjs/testing';
import { FranchiseService } from './franchise.service';
import { IFranchiseRepository } from '../../domain/repositories/franchise.repository.interface';
import { IStoreRepository } from '../../domain/repositories/store.repository.interface';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Franchise } from '../../domain/entities/franchise.entity';
import { CreateFranchiseDto, UpdateFranchiseDto } from '../dtos/franchise.dto';
import { FRANCHISE_REPOSITORY, STORE_REPOSITORY } from '../../infrastructure/infrastructure.module';

describe('FranchiseService', () => {
  let service: FranchiseService;
  let franchiseRepository: jest.Mocked<IFranchiseRepository>;
  let storeRepository: jest.Mocked<IStoreRepository>;

  const mockFranchise = new Franchise(
    'franchise-001',
    'Test Franchise',
    'Test City, TC',
    ['store-001']
  );

  beforeEach(async () => {
    const mockFranchiseRepository: Partial<IFranchiseRepository> = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByName: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    };

    const mockStoreRepository: Partial<IStoreRepository> = {
      findByFranchiseId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FranchiseService,
        {
          provide: FRANCHISE_REPOSITORY,
          useValue: mockFranchiseRepository,
        },
        {
          provide: STORE_REPOSITORY,
          useValue: mockStoreRepository,
        },
      ],
    }).compile();

    service = module.get<FranchiseService>(FranchiseService);
    franchiseRepository = module.get(FRANCHISE_REPOSITORY);
    storeRepository = module.get(STORE_REPOSITORY);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createFranchise', () => {
    const createDto: CreateFranchiseDto = {
      id: 'franchise-002',
      name: 'New Franchise',
      location: 'New City, NC',
      stores: []
    };

    it('should create franchise successfully', async () => {
      franchiseRepository.findById.mockResolvedValue(null); // Franchise doesn't exist
      franchiseRepository.create.mockResolvedValue(mockFranchise);

      const result = await service.createFranchise(createDto);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockFranchise.id);
      expect(franchiseRepository.findById).toHaveBeenCalledWith(createDto.id);
      expect(franchiseRepository.create).toHaveBeenCalled();
    });

    it('should throw ConflictException when franchise already exists', async () => {
      franchiseRepository.findById.mockResolvedValue(mockFranchise);

      await expect(service.createFranchise(createDto)).rejects.toThrow(ConflictException);
      expect(franchiseRepository.findById).toHaveBeenCalledWith(createDto.id);
      expect(franchiseRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('getFranchiseById', () => {
    it('should return franchise when found', async () => {
      franchiseRepository.findById.mockResolvedValue(mockFranchise);

      const result = await service.getFranchiseById('franchise-001');

      expect(result).toBeDefined();
      expect(result.id).toBe('franchise-001');
      expect(franchiseRepository.findById).toHaveBeenCalledWith('franchise-001');
    });

    it('should throw NotFoundException when franchise not found', async () => {
      franchiseRepository.findById.mockResolvedValue(null);

      await expect(service.getFranchiseById('non-existent')).rejects.toThrow(NotFoundException);
      expect(franchiseRepository.findById).toHaveBeenCalledWith('non-existent');
    });
  });

  describe('getAllFranchises', () => {
    it('should return all franchises', async () => {
      const franchises = [mockFranchise];
      franchiseRepository.findAll.mockResolvedValue(franchises);

      const result = await service.getAllFranchises();

      expect(result.franchises).toHaveLength(1);
      expect(result.hasMore).toBe(false);
      expect(franchiseRepository.findAll).toHaveBeenCalled();
    });

    it('should handle pagination correctly', async () => {
      const franchises = [mockFranchise, mockFranchise];
      franchiseRepository.findAll.mockResolvedValue(franchises);

      const result = await service.getAllFranchises(1);

      expect(result.franchises).toHaveLength(1);
      expect(result.hasMore).toBe(true);
      expect(result.lastEvaluatedKey).toBeDefined();
    });
  });

  describe('updateFranchise', () => {
    const updateDto: UpdateFranchiseDto = {
      id: 'franchise-001',
      name: 'Updated Franchise',
      location: 'Updated City, UC',
    };

    it('should update franchise successfully', async () => {
      franchiseRepository.findById.mockResolvedValue(mockFranchise);
      franchiseRepository.update.mockResolvedValue(mockFranchise);

      const result = await service.updateFranchise('franchise-001', updateDto);

      expect(result).toBeDefined();
      expect(franchiseRepository.findById).toHaveBeenCalledWith('franchise-001');
      expect(franchiseRepository.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when franchise not found', async () => {
      franchiseRepository.findById.mockResolvedValue(null);

      await expect(service.updateFranchise('non-existent', updateDto)).rejects.toThrow(NotFoundException);
      expect(franchiseRepository.findById).toHaveBeenCalledWith('non-existent');
      expect(franchiseRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteFranchise', () => {
    it('should delete franchise successfully when no stores exist', async () => {
      franchiseRepository.findById.mockResolvedValue(mockFranchise);
      storeRepository.findByFranchiseId.mockResolvedValue([]);
      franchiseRepository.delete.mockResolvedValue(true);

      await service.deleteFranchise('franchise-001');

      expect(franchiseRepository.findById).toHaveBeenCalledWith('franchise-001');
      expect(storeRepository.findByFranchiseId).toHaveBeenCalledWith('franchise-001');
      expect(franchiseRepository.delete).toHaveBeenCalledWith('franchise-001');
    });

    it('should throw NotFoundException when franchise not found', async () => {
      franchiseRepository.findById.mockResolvedValue(null);

      await expect(service.deleteFranchise('non-existent')).rejects.toThrow(NotFoundException);
      expect(franchiseRepository.findById).toHaveBeenCalledWith('non-existent');
      expect(franchiseRepository.delete).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when franchise has stores', async () => {
      const mockStore = { id: 'store-001', franchiseId: 'franchise-001' } as any;
      franchiseRepository.findById.mockResolvedValue(mockFranchise);
      storeRepository.findByFranchiseId.mockResolvedValue([mockStore]);

      await expect(service.deleteFranchise('franchise-001')).rejects.toThrow(ConflictException);
      expect(storeRepository.findByFranchiseId).toHaveBeenCalledWith('franchise-001');
      expect(franchiseRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('getFranchiseStats', () => {
    it('should return franchise statistics', async () => {
      const mockStores = [
        { id: 'store-001', status: 'active' },
        { id: 'store-002', status: 'active' },
        { id: 'store-003', status: 'inactive' }
      ] as any[];

      franchiseRepository.findById.mockResolvedValue(mockFranchise);
      storeRepository.findByFranchiseId.mockResolvedValue(mockStores);

      const result = await service.getFranchiseStats('franchise-001');

      expect(result.storeCount).toBe(3);
      expect(result.activeStores).toBe(2);
      expect(result.inactiveStores).toBe(1);
      expect(result.franchise).toBeDefined();
    });
  });

  describe('addStoreToFranchise', () => {
    it('should add store to franchise successfully', async () => {
      franchiseRepository.findById.mockResolvedValue(mockFranchise);
      franchiseRepository.update.mockResolvedValue(mockFranchise);

      const result = await service.addStoreToFranchise('franchise-001', 'store-002');

      expect(result).toBeDefined();
      expect(franchiseRepository.findById).toHaveBeenCalledWith('franchise-001');
      expect(franchiseRepository.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when franchise not found', async () => {
      franchiseRepository.findById.mockResolvedValue(null);

      await expect(service.addStoreToFranchise('non-existent', 'store-002')).rejects.toThrow(NotFoundException);
      expect(franchiseRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('removeStoreFromFranchise', () => {
    it('should remove store from franchise successfully', async () => {
      franchiseRepository.findById.mockResolvedValue(mockFranchise);
      franchiseRepository.update.mockResolvedValue(mockFranchise);

      const result = await service.removeStoreFromFranchise('franchise-001', 'store-001');

      expect(result).toBeDefined();
      expect(franchiseRepository.findById).toHaveBeenCalledWith('franchise-001');
      expect(franchiseRepository.update).toHaveBeenCalled();
    });
  });

  describe('searchFranchisesByName', () => {
    it('should return franchises matching name', async () => {
      franchiseRepository.findByName.mockResolvedValue([mockFranchise]);

      const result = await service.searchFranchisesByName('Test');

      expect(result).toHaveLength(1);
      expect(franchiseRepository.findByName).toHaveBeenCalledWith('Test');
    });
  });

  describe('getFranchiseCount', () => {
    it('should return total franchise count', async () => {
      franchiseRepository.count.mockResolvedValue(5);

      const result = await service.getFranchiseCount();

      expect(result).toBe(5);
      expect(franchiseRepository.count).toHaveBeenCalled();
    });
  });
});