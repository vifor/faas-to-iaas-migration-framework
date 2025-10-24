import { Test, TestingModule } from '@nestjs/testing';
import { PetService } from './pet.service';
import { IPetRepository } from '../../domain/repositories/pet.repository.interface';
import { IStoreRepository } from '../../domain/repositories/store.repository.interface';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Pet, PetSpecies, PetStatus } from '../../domain/entities/pet.entity';
import { CreatePetDto, UpdatePetDto } from '../dtos/pet.dto';
import { PET_REPOSITORY, STORE_REPOSITORY } from '../../infrastructure/infrastructure.module';

describe('PetService', () => {
  let service: PetService;
  let petRepository: jest.Mocked<IPetRepository>;
  let storeRepository: jest.Mocked<IStoreRepository>;

  const mockPet = new Pet(
    'pet-001',
    'Buddy',
    'Dog' as PetSpecies,
    'store-001',
    'Golden Retriever',
    36, // 3 years in months
    1200.00,
    'available' as PetStatus
  );

  beforeEach(async () => {
    const mockPetRepository: Partial<IPetRepository> = {
      findByStoreId: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByStatus: jest.fn(),
      findBySpecies: jest.fn(),
      count: jest.fn(),
      findAll: jest.fn(),
    };

    const mockStoreRepository: Partial<IStoreRepository> = {
      findByCompositeKey: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PetService,
        {
          provide: PET_REPOSITORY,
          useValue: mockPetRepository,
        },
        {
          provide: STORE_REPOSITORY,
          useValue: mockStoreRepository,
        },
      ],
    }).compile();

    service = module.get<PetService>(PetService);
    petRepository = module.get(PET_REPOSITORY);
    storeRepository = module.get(STORE_REPOSITORY);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPet', () => {
    const createDto: CreatePetDto = {
      name: 'New Pet',
      species: 'Cat' as PetSpecies,
      breed: 'Persian',
      age: 24,
      price: 800.00,
      status: 'available' as PetStatus,
      description: 'Beautiful persian cat'
    };

    it('should create pet successfully', async () => {
      storeRepository.findByCompositeKey.mockResolvedValue({} as any); // Store exists
      petRepository.create.mockResolvedValue(mockPet);

      const result = await service.createPet(createDto, 'store-001');

      expect(result).toBeDefined();
      expect(storeRepository.findByCompositeKey).toHaveBeenCalledWith('store-001', 'main');
      expect(petRepository.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException when store does not exist', async () => {
      storeRepository.findByCompositeKey.mockResolvedValue(null);

      await expect(service.createPet(createDto, 'non-existent-store')).rejects.toThrow(BadRequestException);
      expect(storeRepository.findByCompositeKey).toHaveBeenCalledWith('non-existent-store', 'main');
      expect(petRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('getPetsByStoreId', () => {
    it('should return pets for store', async () => {
      const pets = [mockPet];
      petRepository.findByStoreId.mockResolvedValue(pets);

      const result = await service.getPetsByStoreId('store-001');

      expect(result).toHaveLength(1);
      expect(petRepository.findByStoreId).toHaveBeenCalledWith('store-001');
    });

    it('should return empty array when no pets found', async () => {
      petRepository.findByStoreId.mockResolvedValue([]);

      const result = await service.getPetsByStoreId('store-001');

      expect(result).toHaveLength(0);
      expect(petRepository.findByStoreId).toHaveBeenCalledWith('store-001');
    });
  });

  describe('getPetById', () => {
    it('should return pet when found', async () => {
      petRepository.findById.mockResolvedValue(mockPet);

      const result = await service.getPetById('pet-001');

      expect(result).toBeDefined();
      expect(result.id).toBe('pet-001');
      expect(petRepository.findById).toHaveBeenCalledWith('pet-001');
    });

    it('should throw NotFoundException when pet not found', async () => {
      petRepository.findById.mockResolvedValue(null);

      await expect(service.getPetById('non-existent')).rejects.toThrow(NotFoundException);
      expect(petRepository.findById).toHaveBeenCalledWith('non-existent');
    });
  });

  describe('updatePet', () => {
    const updateDto: UpdatePetDto = {
      name: 'Updated Pet',
      price: 1500.00,
      status: 'sold' as PetStatus,
      description: 'Updated description'
    };

    it('should update pet successfully', async () => {
      petRepository.findById.mockResolvedValue(mockPet);
      petRepository.update.mockResolvedValue(mockPet);

      const result = await service.updatePet('pet-001', updateDto);

      expect(result).toBeDefined();
      expect(petRepository.findById).toHaveBeenCalledWith('pet-001');
      expect(petRepository.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when pet not found', async () => {
      petRepository.findById.mockResolvedValue(null);

      await expect(service.updatePet('non-existent', updateDto)).rejects.toThrow(NotFoundException);
      expect(petRepository.findById).toHaveBeenCalledWith('non-existent');
      expect(petRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('deletePet', () => {
    it('should delete pet successfully', async () => {
      petRepository.findById.mockResolvedValue(mockPet);
      petRepository.delete.mockResolvedValue(true);

      await service.deletePet('pet-001');

      expect(petRepository.findById).toHaveBeenCalledWith('pet-001');
      expect(petRepository.delete).toHaveBeenCalledWith('pet-001');
    });

    it('should throw NotFoundException when pet not found', async () => {
      petRepository.findById.mockResolvedValue(null);

      await expect(service.deletePet('non-existent')).rejects.toThrow(NotFoundException);
      expect(petRepository.findById).toHaveBeenCalledWith('non-existent');
      expect(petRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('getPetsByStatus', () => {
    it('should return pets with specified status', async () => {
      const availablePets = [mockPet];
      petRepository.findByStatus.mockResolvedValue(availablePets);

      const result = await service.getPetsByStatus('available' as PetStatus);

      expect(result).toHaveLength(1);
      expect(petRepository.findByStatus).toHaveBeenCalledWith('available');
    });
  });

  describe('getPetsBySpecies', () => {
    it('should return pets of specified species', async () => {
      const dogs = [mockPet];
      petRepository.findBySpecies.mockResolvedValue(dogs);

      const result = await service.getPetsBySpecies('Dog' as PetSpecies);

      expect(result).toHaveLength(1);
      expect(petRepository.findBySpecies).toHaveBeenCalledWith('Dog');
    });
  });

  describe('getPetCount', () => {
    it('should return total pet count', async () => {
      petRepository.count.mockResolvedValue(25);

      const result = await service.getPetCount();

      expect(result).toBe(25);
      expect(petRepository.count).toHaveBeenCalled();
    });
  });
});