// Test data generators for K6 load tests
import { config } from './environment.js';

/**
 * Generate random string with given length
 */
function randomString(length, charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
}

/**
 * Generate random number between min and max (inclusive)
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate random float between min and max
 */
function randomFloat(min, max, decimals = 2) {
  const value = Math.random() * (max - min) + min;
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/**
 * Select random item from array
 */
function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Generate unique ID with timestamp and random suffix
 */
function generateUniqueId(prefix = 'test') {
  const timestamp = Date.now();
  const random = randomString(6, '0123456789abcdef');
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Franchise Data Generators
 */
export class FranchiseGenerator {
  static generate() {
    const id = generateUniqueId('franchise');
    const name = `${config.testData.franchises.namePrefix} ${randomString(8)}`;
    const location = `${config.testData.franchises.locationPrefix} ${randomString(10)}`;
    const storeCount = randomInt(1, 5);
    const stores = Array.from({ length: storeCount }, () => generateUniqueId('store'));

    return {
      id,
      name,
      location,
      stores
    };
  }

  static generateUpdate(existingFranchise) {
    return {
      ...existingFranchise,
      name: `${existingFranchise.name} - Updated`,
      location: `${existingFranchise.location} - Updated`
    };
  }

  static generateBatch(count = 10) {
    return Array.from({ length: count }, () => this.generate());
  }
}

/**
 * Store Data Generators
 */
export class StoreGenerator {
  static generate(franchiseId = null) {
    const id = generateUniqueId('store');
    const value = randomChoice(config.testData.stores.storeTypes);
    const name = `${config.testData.stores.namePrefix} ${randomString(8)}`;
    const address = `${randomInt(1, 9999)} ${config.testData.stores.addressPrefix} ${randomString(6)}`;

    const store = {
      id,
      value,
      name,
      address
    };

    if (franchiseId) {
      store.franchiseId = franchiseId;
    }

    return store;
  }

  static generateUpdate(existingStore) {
    return {
      ...existingStore,
      name: `${existingStore.name} - Updated`,
      address: `${existingStore.address} - Updated`
    };
  }

  static generateBatch(count = 10, franchiseId = null) {
    return Array.from({ length: count }, () => this.generate(franchiseId));
  }

  static getRandomStoreId() {
    return randomChoice(config.store.defaultStores);
  }
}

/**
 * Pet Data Generators
 */
export class PetGenerator {
  static generate() {
    const species = randomChoice(config.testData.pets.species);
    const breeds = config.testData.pets.breeds[species] || ['Mixed'];
    const breed = randomChoice(breeds);
    const name = `${config.testData.pets.namePrefix} ${randomString(6)}`;
    const age = randomInt(
      config.testData.pets.ageRange.min,
      config.testData.pets.ageRange.max
    );
    const price = randomFloat(
      config.testData.pets.priceRange.min,
      config.testData.pets.priceRange.max
    );
    const status = randomChoice(['available', 'pending', 'sold']);

    return {
      name,
      species,
      breed,
      age,
      price,
      status
    };
  }

  static generateUpdate(existingPet) {
    return {
      ...existingPet,
      name: `${existingPet.name} - Updated`,
      age: existingPet.age + 1,
      price: existingPet.price + randomFloat(10, 100)
    };
  }

  static generateBatch(count = 10) {
    return Array.from({ length: count }, () => this.generate());
  }

  static generateRandomPetId() {
    return generateUniqueId('pet');
  }
}

/**
 * Order Data Generators
 */
export class OrderGenerator {
  static generate(petId = null, customerId = null) {
    const order = {
      petId: petId || PetGenerator.generateRandomPetId(),
      quantity: randomInt(
        config.testData.orders.quantityRange.min,
        config.testData.orders.quantityRange.max
      ),
      customerId: customerId || this.generateCustomerId()
    };

    return order;
  }

  static generateCustomerId() {
    const customerNumber = randomInt(1, config.testData.orders.maxCustomers);
    return `${config.testData.orders.customerPrefix}-${customerNumber.toString().padStart(6, '0')}`;
  }

  static generateOrderNumber() {
    return generateUniqueId('order');
  }

  static generateBatch(count = 10) {
    return Array.from({ length: count }, () => this.generate());
  }
}

/**
 * User Data Generators
 */
export class UserGenerator {
  static generateTestUser() {
    const id = randomInt(1000, 9999);
    return {
      username: `testuser${id}@example.com`,
      password: `TempPassword${id}!`,
      storeId: StoreGenerator.getRandomStoreId()
    };
  }

  static generateManagerUser() {
    const id = randomInt(1000, 9999);
    return {
      username: `manager${id}@example.com`,
      password: `ManagerPass${id}!`,
      storeId: StoreGenerator.getRandomStoreId(),
      role: 'manager'
    };
  }

  static generateAdminUser() {
    const id = randomInt(1000, 9999);
    return {
      username: `admin${id}@example.com`,
      password: `AdminPass${id}!`,
      role: 'admin'
    };
  }
}

/**
 * Test Scenario Data Generators
 */
export class ScenarioGenerator {
  static generateFranchiseWorkflow() {
    const franchise = FranchiseGenerator.generate();
    const stores = StoreGenerator.generateBatch(randomInt(2, 5), franchise.id);
    
    return {
      franchise,
      stores,
      workflow: [
        { action: 'create_franchise', data: franchise },
        ...stores.map(store => ({ action: 'create_store', data: store })),
        { action: 'list_franchises' },
        { action: 'get_franchise', id: franchise.id },
        { action: 'update_franchise', data: FranchiseGenerator.generateUpdate(franchise) },
        { action: 'list_stores' },
        ...stores.map(store => ({ action: 'get_store', id: store.id, value: store.value }))
      ]
    };
  }

  static generateStoreWorkflow() {
    const storeId = StoreGenerator.getRandomStoreId();
    const pets = PetGenerator.generateBatch(randomInt(3, 8));
    const orders = OrderGenerator.generateBatch(randomInt(2, 5));

    return {
      storeId,
      pets,
      orders,
      workflow: [
        { action: 'get_inventory', storeId },
        ...pets.map(pet => ({ action: 'add_pet', storeId, data: pet })),
        { action: 'search_pets', storeId },
        ...orders.map(order => ({ action: 'place_order', storeId, data: order })),
        { action: 'list_orders', storeId }
      ]
    };
  }

  static generateMixedWorkflow() {
    const franchiseWorkflow = this.generateFranchiseWorkflow();
    const storeWorkflow = this.generateStoreWorkflow();

    return {
      ...franchiseWorkflow,
      ...storeWorkflow,
      workflow: [
        ...franchiseWorkflow.workflow.slice(0, 3),
        ...storeWorkflow.workflow.slice(0, 4),
        ...franchiseWorkflow.workflow.slice(3),
        ...storeWorkflow.workflow.slice(4)
      ]
    };
  }
}

/**
 * Performance Test Data
 */
export class PerformanceTestData {
  static getLargeDataset() {
    return {
      franchises: FranchiseGenerator.generateBatch(100),
      stores: StoreGenerator.generateBatch(500),
      pets: PetGenerator.generateBatch(1000),
      orders: OrderGenerator.generateBatch(200)
    };
  }

  static getSmallDataset() {
    return {
      franchises: FranchiseGenerator.generateBatch(5),
      stores: StoreGenerator.generateBatch(20),
      pets: PetGenerator.generateBatch(50),
      orders: OrderGenerator.generateBatch(10)
    };
  }

  static getStressTestData() {
    return {
      franchises: FranchiseGenerator.generateBatch(1000),
      stores: StoreGenerator.generateBatch(5000),
      pets: PetGenerator.generateBatch(10000),
      orders: OrderGenerator.generateBatch(2000)
    };
  }
}

/**
 * Realistic Data Patterns
 */
export class RealisticDataGenerator {
  static generateRealisticFranchise() {
    const franchiseNames = [
      'Pet Paradise', 'Happy Paws', 'Furry Friends', 'Pet Palace', 'Animal Kingdom',
      'Paw Print', 'Pet World', 'Creature Comforts', 'Wild Things', 'Pet Haven'
    ];
    
    const locations = [
      'New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX', 'Phoenix, AZ',
      'Philadelphia, PA', 'San Antonio, TX', 'San Diego, CA', 'Dallas, TX', 'San Jose, CA'
    ];

    return {
      id: generateUniqueId('franchise'),
      name: `${randomChoice(franchiseNames)} ${randomString(3, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ')}`,
      location: randomChoice(locations),
      stores: []
    };
  }

  static generateRealisticStore(franchiseId = null) {
    const storeTypes = ['Downtown', 'Mall', 'Shopping Center', 'Suburban', 'Airport'];
    const streetNames = ['Main St', 'Oak Ave', 'Park Blvd', 'First St', 'Broadway', 'Market St'];
    
    return {
      id: generateUniqueId('store'),
      value: randomChoice(['main', 'branch', 'outlet']),
      name: `${randomChoice(storeTypes)} Pet Store`,
      address: `${randomInt(100, 9999)} ${randomChoice(streetNames)}`,
      franchiseId: franchiseId
    };
  }

  static generateRealisticPet() {
    const dogNames = ['Buddy', 'Max', 'Charlie', 'Cooper', 'Rocky', 'Bear', 'Tucker', 'Duke'];
    const catNames = ['Luna', 'Bella', 'Oliver', 'Milo', 'Simba', 'Tiger', 'Shadow', 'Smokey'];
    const birdNames = ['Sunny', 'Rainbow', 'Echo', 'Tweety', 'Sky', 'Flash', 'Whistle'];
    
    const species = randomChoice(['Dog', 'Cat', 'Bird']);
    let name, breeds;
    
    switch (species) {
      case 'Dog':
        name = randomChoice(dogNames);
        breeds = ['Golden Retriever', 'Labrador', 'German Shepherd', 'Bulldog', 'Beagle'];
        break;
      case 'Cat':
        name = randomChoice(catNames);
        breeds = ['Persian', 'Siamese', 'Maine Coon', 'British Shorthair', 'Ragdoll'];
        break;
      case 'Bird':
        name = randomChoice(birdNames);
        breeds = ['Parakeet', 'Canary', 'Cockatiel', 'Finch', 'Lovebird'];
        break;
    }

    return {
      name,
      species,
      breed: randomChoice(breeds),
      age: randomInt(2, 60), // 2 months to 5 years
      price: randomFloat(100, 1200),
      status: 'available'
    };
  }
}

/**
 * Utility functions for test data management
 */
export class TestDataUtils {
  static saveTestData(key, data) {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      globalThis.localStorage.setItem(key, JSON.stringify(data));
    }
  }

  static loadTestData(key) {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      const data = globalThis.localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    }
    return null;
  }

  static clearTestData(key = null) {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      if (key) {
        globalThis.localStorage.removeItem(key);
      } else {
        globalThis.localStorage.clear();
      }
    }
  }

  static generateTestDataSet(name, size = 'medium') {
    let dataset;
    
    switch (size) {
      case 'small':
        dataset = PerformanceTestData.getSmallDataset();
        break;
      case 'large':
        dataset = PerformanceTestData.getLargeDataset();
        break;
      case 'stress':
        dataset = PerformanceTestData.getStressTestData();
        break;
      default:
        dataset = {
          franchises: FranchiseGenerator.generateBatch(25),
          stores: StoreGenerator.generateBatch(100),
          pets: PetGenerator.generateBatch(250),
          orders: OrderGenerator.generateBatch(50)
        };
    }

    this.saveTestData(name, dataset);
    return dataset;
  }
}