// Store operations for customer-facing functionality with authorization
import http from 'k6/http';
import { check } from 'k6';
import { getStoreHeaders } from '../config/auth.js';

export class StoreOperations {
  constructor(config) {
    this.config = config;
    this.baseUrl = config.baseUrl;
    this.storePath = config.store.basePath;
    this.timeout = config.store.timeout;
  }

  /**
   * Pet Management Operations
   */
  
  searchPets(storeId, userIndex = 0) {
    const url = `${this.baseUrl}${this.storePath}/${storeId}/pets`;
    const params = {
      headers: getStoreHeaders(userIndex),
      timeout: this.timeout
    };
    
    return http.get(url, params);
  }

  addPet(storeId, petData, userIndex = 0) {
    const url = `${this.baseUrl}${this.storePath}/${storeId}/pet/create`;
    const payload = JSON.stringify(petData);
    const params = {
      headers: getStoreHeaders(userIndex),
      timeout: this.timeout
    };
    
    return http.post(url, payload, params);
  }

  getPet(storeId, petId, userIndex = 0) {
    const url = `${this.baseUrl}${this.storePath}/${storeId}/pet/get/${petId}`;
    const params = {
      headers: getStoreHeaders(userIndex),
      timeout: this.timeout
    };
    
    return http.get(url, params);
  }

  updatePet(storeId, petId, petData, userIndex = 0) {
    const url = `${this.baseUrl}${this.storePath}/${storeId}/pet/update/${petId}`;
    const payload = JSON.stringify(petData);
    const params = {
      headers: getStoreHeaders(userIndex),
      timeout: this.timeout
    };
    
    return http.post(url, payload, params);
  }

  /**
   * Order Management Operations
   */
  
  listOrders(storeId, userIndex = 0) {
    const url = `${this.baseUrl}${this.storePath}/${storeId}/orders`;
    const params = {
      headers: getStoreHeaders(userIndex),
      timeout: this.timeout
    };
    
    return http.get(url, params);
  }

  placeOrder(storeId, orderData, userIndex = 0) {
    const url = `${this.baseUrl}${this.storePath}/${storeId}/order/create`;
    const payload = JSON.stringify(orderData);
    const params = {
      headers: getStoreHeaders(userIndex),
      timeout: this.timeout
    };
    
    return http.post(url, payload, params);
  }

  getOrder(storeId, orderNumber, userIndex = 0) {
    const url = `${this.baseUrl}${this.storePath}/${storeId}/order/get/${orderNumber}`;
    const params = {
      headers: getStoreHeaders(userIndex),
      timeout: this.timeout
    };
    
    return http.get(url, params);
  }

  cancelOrder(storeId, orderNumber, userIndex = 0) {
    const url = `${this.baseUrl}${this.storePath}/${storeId}/order/cancel/${orderNumber}`;
    const params = {
      headers: getStoreHeaders(userIndex),
      timeout: this.timeout
    };
    
    return http.post(url, null, params);
  }

  /**
   * Inventory Operations
   */
  
  getInventory(storeId, userIndex = 0) {
    const url = `${this.baseUrl}${this.storePath}/${storeId}/inventory`;
    const params = {
      headers: getStoreHeaders(userIndex),
      timeout: this.timeout
    };
    
    return http.get(url, params);
  }

  /**
   * Complete pet workflow
   */
  executePetWorkflow(storeId, petData, userIndex = 0) {
    const results = {
      search: null,
      add: null,
      get: null,
      update: null
    };

    // Search pets first
    results.search = this.searchPets(storeId, userIndex);
    
    // Add new pet
    results.add = this.addPet(storeId, petData, userIndex);
    
    if (results.add.status === 200) {
      // For demo purposes, we'll use a generated pet ID
      const petId = `pet-${Date.now()}`;
      
      // Get the pet (would normally use ID from add response)
      results.get = this.getPet(storeId, petId, userIndex);
      
      // Update the pet
      const updateData = { ...petData, name: `${petData.name} - Updated` };
      results.update = this.updatePet(storeId, petId, updateData, userIndex);
    }

    return results;
  }

  /**
   * Complete order workflow
   */
  executeOrderWorkflow(storeId, orderData, userIndex = 0) {
    const results = {
      list: null,
      place: null,
      get: null,
      cancel: null
    };

    // List existing orders
    results.list = this.listOrders(storeId, userIndex);
    
    // Place new order
    results.place = this.placeOrder(storeId, orderData, userIndex);
    
    if (results.place.status === 200) {
      // For demo purposes, we'll use a generated order number
      const orderNumber = `order-${Date.now()}`;
      
      // Get the order (would normally use number from place response)
      results.get = this.getOrder(storeId, orderNumber, userIndex);
      
      // Optionally cancel the order (commented out for load testing)
      // results.cancel = this.cancelOrder(storeId, orderNumber, userIndex);
    }

    return results;
  }

  /**
   * Complete store workflow
   */
  executeStoreWorkflow(storeId, workflowData, userIndex = 0) {
    const results = {
      inventory: null,
      pets: [],
      orders: []
    };

    // Check inventory first
    results.inventory = this.getInventory(storeId, userIndex);
    
    // Execute pet operations
    if (workflowData.pets && workflowData.pets.length > 0) {
      workflowData.pets.forEach(pet => {
        const petResult = this.executePetWorkflow(storeId, pet, userIndex);
        results.pets.push(petResult);
      });
    }
    
    // Execute order operations
    if (workflowData.orders && workflowData.orders.length > 0) {
      workflowData.orders.forEach(order => {
        const orderResult = this.executeOrderWorkflow(storeId, order, userIndex);
        results.orders.push(orderResult);
      });
    }

    return results;
  }

  /**
   * Batch operations for stress testing
   */
  addMultiplePets(storeId, petList, userIndex = 0) {
    const results = [];
    
    petList.forEach(pet => {
      const response = this.addPet(storeId, pet, userIndex);
      results.push({
        pet: pet,
        response: response,
        success: response.status === 200 && this.isAuthorized(response)
      });
    });
    
    return results;
  }

  placeMultipleOrders(storeId, orderList, userIndex = 0) {
    const results = [];
    
    orderList.forEach(order => {
      const response = this.placeOrder(storeId, order, userIndex);
      results.push({
        order: order,
        response: response,
        success: response.status === 200 && this.isAuthorized(response)
      });
    });
    
    return results;
  }

  /**
   * Authorization testing
   */
  testUnauthorizedAccess(storeId) {
    const url = `${this.baseUrl}${this.storePath}/${storeId}/pets`;
    const params = {
      headers: { 'Content-Type': 'application/json' }, // No JWT token
      timeout: this.timeout
    };
    
    return http.get(url, params);
  }

  testCrossStoreAccess(storeId, userIndex = 0) {
    // Try to access a different store than the user is authorized for
    const unauthorizedStoreId = storeId === 'store-001' ? 'store-002' : 'store-001';
    const url = `${this.baseUrl}${this.storePath}/${unauthorizedStoreId}/pets`;
    const params = {
      headers: getStoreHeaders(userIndex),
      timeout: this.timeout
    };
    
    return http.get(url, params);
  }

  testExpiredToken(storeId) {
    const url = `${this.baseUrl}${this.storePath}/${storeId}/pets`;
    const params = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer expired.jwt.token'
      },
      timeout: this.timeout
    };
    
    return http.get(url, params);
  }

  /**
   * Error scenario testing
   */
  testInvalidPetData(storeId, userIndex = 0) {
    const invalidPetData = { invalidField: 'test' }; // Missing required fields
    return this.addPet(storeId, invalidPetData, userIndex);
  }

  testInvalidOrderData(storeId, userIndex = 0) {
    const invalidOrderData = { invalidField: 'test' }; // Missing required fields
    return this.placeOrder(storeId, invalidOrderData, userIndex);
  }

  testNonExistentPet(storeId, userIndex = 0) {
    return this.getPet(storeId, 'non-existent-pet', userIndex);
  }

  testNonExistentOrder(storeId, userIndex = 0) {
    return this.getOrder(storeId, 'non-existent-order', userIndex);
  }

  /**
   * Performance scenarios
   */
  executeHighVolumeSearch(storeId, requestCount = 100, userIndex = 0) {
    const results = [];
    const startTime = Date.now();
    
    for (let i = 0; i < requestCount; i++) {
      const response = this.searchPets(storeId, userIndex);
      results.push(response);
    }
    
    const endTime = Date.now();
    const totalDuration = endTime - startTime;
    
    return {
      results: results,
      totalDuration: totalDuration,
      averageResponseTime: totalDuration / requestCount,
      successRate: results.filter(r => r.status === 200).length / requestCount
    };
  }

  /**
   * User simulation scenarios
   */
  simulateCustomerSession(storeId, userIndex = 0) {
    const session = {
      startTime: Date.now(),
      operations: [],
      success: true
    };

    try {
      // 1. Customer searches for pets
      const searchResponse = this.searchPets(storeId, userIndex);
      session.operations.push({ type: 'search_pets', response: searchResponse });
      
      // 2. Customer checks inventory
      const inventoryResponse = this.getInventory(storeId, userIndex);
      session.operations.push({ type: 'check_inventory', response: inventoryResponse });
      
      // 3. Customer views existing orders
      const ordersResponse = this.listOrders(storeId, userIndex);
      session.operations.push({ type: 'view_orders', response: ordersResponse });
      
      // 4. Customer places an order (simulate)
      const orderData = {
        petId: 'pet-demo-001',
        quantity: 1,
        customerId: `customer-${userIndex}-${Date.now()}`
      };
      const placeOrderResponse = this.placeOrder(storeId, orderData, userIndex);
      session.operations.push({ type: 'place_order', response: placeOrderResponse });
      
    } catch (error) {
      session.success = false;
      session.error = error.message;
    }

    session.endTime = Date.now();
    session.duration = session.endTime - session.startTime;
    
    return session;
  }

  simulateManagerSession(storeId, userIndex = 0) {
    const session = {
      startTime: Date.now(),
      operations: [],
      success: true
    };

    try {
      // 1. Manager checks inventory
      const inventoryResponse = this.getInventory(storeId, userIndex);
      session.operations.push({ type: 'check_inventory', response: inventoryResponse });
      
      // 2. Manager adds new pets
      const petData = {
        name: 'Manager Test Pet',
        species: 'Dog',
        breed: 'Test Breed',
        age: 12,
        price: 500.00,
        status: 'available'
      };
      const addPetResponse = this.addPet(storeId, petData, userIndex);
      session.operations.push({ type: 'add_pet', response: addPetResponse });
      
      // 3. Manager reviews orders
      const ordersResponse = this.listOrders(storeId, userIndex);
      session.operations.push({ type: 'review_orders', response: ordersResponse });
      
    } catch (error) {
      session.success = false;
      session.error = error.message;
    }

    session.endTime = Date.now();
    session.duration = session.endTime - session.startTime;
    
    return session;
  }

  /**
   * Validation helpers
   */
  validateAuthorizedResponse(response, expectedDecision = 'ALLOW') {
    const validations = {
      'status is 200': response.status === 200,
      'response has body': response.body && response.body.length > 0,
      'response is JSON': this.isValidJSON(response.body),
      'authorization decision is correct': this.checkAuthDecision(response, expectedDecision),
      'response time acceptable': response.timings.duration < this.timeout
    };

    return check(response, validations);
  }

  isAuthorized(response) {
    if (response.status !== 200) return false;
    
    try {
      const data = JSON.parse(response.body);
      return data.decision === 'ALLOW';
    } catch (e) {
      return false;
    }
  }

  checkAuthDecision(response, expectedDecision) {
    try {
      const data = JSON.parse(response.body);
      return data.decision === expectedDecision;
    } catch (e) {
      return false;
    }
  }

  isValidJSON(str) {
    try {
      JSON.parse(str);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Performance monitoring helpers
   */
  measureOperationTime(operation, ...args) {
    const startTime = Date.now();
    const result = operation.apply(this, args);
    const endTime = Date.now();
    
    return {
      result: result,
      duration: endTime - startTime,
      success: result.status === 200 && this.isAuthorized(result)
    };
  }
}