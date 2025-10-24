import { Test, TestingModule } from '@nestjs/testing';
import { StoreService } from './store.service';
import { IStoreRepository } from '../../domain/repositories/store.repository.interface';
import { IFranchiseRepository } from '../../domain/repositories/franchise.repository.interface';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Store } from '../../domain/entities/store.entity';
import { CreateStoreDto, UpdateStoreDto } from '../dtos/store.dto';
import { STORE_REPOSITORY, FRANCHISE_REPOSITORY } from '../../infrastructure/infrastructure.module';

describe('StoreService', () => {
  let service: StoreService;
  let storeRepository: jest.Mocked<IStoreRepository>;
  let franchiseRepository: jest.Mocked<IFranchiseRepository>;

  const mockStore = new Store(
    'store-001',
    'store-data',
    'franchise-001',
    'Test Store',
    '123 Test St, Test City, TC',
    'Test Manager',
    '+1-555-TEST'
  );

  beforeEach(async () => {
    const mockStoreRepository: Partial<IStoreRepository> = {
      findAll: jest.fn(),
      findByCompositeKey: jest.fn(),
      findByFranchiseId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    };

    const mockFranchiseRepository: Partial<IFranchiseRepository> = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoreService,
        {
          provide: STORE_REPOSITORY,
          useValue: mockStoreRepository,
        },
        {
          provide: FRANCHISE_REPOSITORY,
          useValue: mockFranchiseRepository,
        },
      ],
    }).compile();

    service = module.get<StoreService>(StoreService);
    storeRepository = module.get(STORE_REPOSITORY);
    franchiseRepository = module.get(FRANCHISE_REPOSITORY);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createStore', () => {
    const createDto: CreateStoreDto = {
      id: 'store-002',
      value: 'store-data',
      franchiseId: 'franchise-001',
      name: 'New Store',
      address: '456 New St, New City, NC',
      manager: 'New Manager',
      phone: '+1-555-NEW'
    };

    it('should create store successfully', async () => {
      storeRepository.findByCompositeKey.mockResolvedValue(null); // Store doesn't exist
      franchiseRepository.findById.mockResolvedValue({} as any); // Franchise exists
      storeRepository.create.mockResolvedValue(mockStore);

      const result = await service.createStore(createDto);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockStore.id);
      expect(storeRepository.findByCompositeKey).toHaveBeenCalledWith(createDto.id, createDto.value);
      expect(franchiseRepository.findById).toHaveBeenCalledWith(createDto.franchiseId);
      expect(storeRepository.create).toHaveBeenCalled();
    });

    it('should throw ConflictException when store already exists', async () => {
      storeRepository.findByCompositeKey.mockResolvedValue(mockStore);

      await expect(service.createStore(createDto)).rejects.toThrow(ConflictException);
      expect(storeRepository.findByCompositeKey).toHaveBeenCalledWith(createDto.id, createDto.value);
      expect(storeRepository.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when franchise does not exist', async () => {
      storeRepository.findByCompositeKey.mockResolvedValue(null);
      franchiseRepository.findById.mockResolvedValue(null);

      await expect(service.createStore(createDto)).rejects.toThrow(BadRequestException);
      expect(franchiseRepository.findById).toHaveBeenCalledWith(createDto.franchiseId);
      expect(storeRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('getStoreByCompositeKey', () => {
    it('should return store when found', async () => {
      storeRepository.findByCompositeKey.mockResolvedValue(mockStore);

      const result = await service.getStoreByCompositeKey('store-001', 'store-data');

      expect(result).toBeDefined();
      expect(result.id).toBe('store-001');
      expect(storeRepository.findByCompositeKey).toHaveBeenCalledWith('store-001', 'store-data');
    });

    it('should throw NotFoundException when store not found', async () => {
      storeRepository.findByCompositeKey.mockResolvedValue(null);

      await expect(service.getStoreByCompositeKey('non-existent', 'store-data')).rejects.toThrow(NotFoundException);
      expect(storeRepository.findByCompositeKey).toHaveBeenCalledWith('non-existent', 'store-data');
    });
  });

  describe('getAllStores', () => {
    it('should return all stores', async () => {
      const stores = [mockStore];
      storeRepository.findAll.mockResolvedValue(stores);

      const result = await service.getAllStores();

      expect(result.stores).toHaveLength(1);
      expect(result.hasMore).toBe(false);
      expect(storeRepository.findAll).toHaveBeenCalled();
    });

    it('should handle pagination correctly', async () => {
      const stores = [mockStore, mockStore];
      storeRepository.findAll.mockResolvedValue(stores);

      const result = await service.getAllStores(1);

      expect(result.stores).toHaveLength(1);
      expect(result.hasMore).toBe(true);
      expect(result.lastEvaluatedKey).toBeDefined();
    });
  });

  describe('getStoresByFranchiseId', () => {
    it('should return stores for franchise', async () => {
      const stores = [mockStore];
      storeRepository.findByFranchiseId.mockResolvedValue(stores);

      const result = await service.getStoresByFranchiseId('franchise-001');

      expect(result).toHaveLength(1);
      expect(storeRepository.findByFranchiseId).toHaveBeenCalledWith('franchise-001');
    });
  });

  describe('updateStore', () => {
    const updateDto: UpdateStoreDto = {
      name: 'Updated Store',
      address: 'Updated Address',
      manager: 'Updated Manager',
      phone: '+1-555-UPDATED'
    };

    it('should update store successfully', async () => {
      storeRepository.findByCompositeKey.mockResolvedValue(mockStore);
      storeRepository.update.mockResolvedValue(mockStore);

      const result = await service.updateStore('store-001', 'store-data', updateDto);

      expect(result).toBeDefined();
      expect(storeRepository.findByCompositeKey).toHaveBeenCalledWith('store-001', 'store-data');
      expect(storeRepository.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when store not found', async () => {
      storeRepository.findByCompositeKey.mockResolvedValue(null);

      await expect(service.updateStore('non-existent', 'store-data', updateDto)).rejects.toThrow(NotFoundException);
      expect(storeRepository.findByCompositeKey).toHaveBeenCalledWith('non-existent', 'store-data');
      expect(storeRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteStore', () => {
    it('should delete store successfully', async () => {
      storeRepository.findByCompositeKey.mockResolvedValue(mockStore);
      storeRepository.delete.mockResolvedValue(true);

      await service.deleteStore('store-001', 'store-data');

      expect(storeRepository.findByCompositeKey).toHaveBeenCalledWith('store-001', 'store-data');
      expect(storeRepository.delete).toHaveBeenCalledWith('store-001', 'store-data');
    });

    it('should throw NotFoundException when store not found', async () => {
      storeRepository.findByCompositeKey.mockResolvedValue(null);

      await expect(service.deleteStore('non-existent', 'store-data')).rejects.toThrow(NotFoundException);
      expect(storeRepository.findByCompositeKey).toHaveBeenCalledWith('non-existent', 'store-data');
      expect(storeRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('getStoreCount', () => {
    it('should return total store count', async () => {
      storeRepository.count.mockResolvedValue(10);

      const result = await service.getStoreCount();

      expect(result).toBe(10);
      expect(storeRepository.count).toHaveBeenCalled();
    });
  });
});