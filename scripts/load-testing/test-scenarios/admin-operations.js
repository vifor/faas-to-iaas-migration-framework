// Administrative operations for franchise and store management
import http from 'k6/http';
import { check } from 'k6';
import { getAdminHeaders } from '../config/auth.js';

export class AdminOperations {
  constructor(config) {
    this.config = config;
    this.baseUrl = config.baseUrl;
    this.adminPath = config.admin.basePath;
    this.timeout = config.admin.timeout;
  }

  /**
   * Franchise Management Operations
   */
  
  listFranchises() {
    const url = `${this.baseUrl}${this.adminPath}/franchise`;
    const params = {
      headers: getAdminHeaders(),
      timeout: this.timeout
    };
    
    return http.get(url, params);
  }

  createFranchise(franchiseData) {
    const url = `${this.baseUrl}${this.adminPath}/franchise`;
    const payload = JSON.stringify(franchiseData);
    const params = {
      headers: getAdminHeaders(),
      timeout: this.timeout
    };
    
    return http.post(url, payload, params);
  }

  getFranchise(franchiseId) {
    const url = `${this.baseUrl}${this.adminPath}/franchise/object/${franchiseId}`;
    const params = {
      headers: getAdminHeaders(),
      timeout: this.timeout
    };
    
    return http.get(url, params);
  }

  getFranchisesByID(franchiseId) {
    const url = `${this.baseUrl}${this.adminPath}/franchise/${franchiseId}`;
    const params = {
      headers: getAdminHeaders(),
      timeout: this.timeout
    };
    
    return http.get(url, params);
  }

  updateFranchise(franchiseData) {
    const url = `${this.baseUrl}${this.adminPath}/franchise`;
    const payload = JSON.stringify(franchiseData);
    const params = {
      headers: getAdminHeaders(),
      timeout: this.timeout
    };
    
    return http.put(url, payload, params);
  }

  deleteFranchise(franchiseId) {
    const url = `${this.baseUrl}${this.adminPath}/franchise/object/${franchiseId}`;
    const params = {
      headers: getAdminHeaders(),
      timeout: this.timeout
    };
    
    return http.del(url, null, params);
  }

  /**
   * Store Management Operations
   */
  
  listStores() {
    const url = `${this.baseUrl}${this.adminPath}/store`;
    const params = {
      headers: getAdminHeaders(),
      timeout: this.timeout
    };
    
    return http.get(url, params);
  }

  createStore(storeData) {
    const url = `${this.baseUrl}${this.adminPath}/store`;
    const payload = JSON.stringify(storeData);
    const params = {
      headers: getAdminHeaders(),
      timeout: this.timeout
    };
    
    return http.post(url, payload, params);
  }

  getStore(storeId, storeValue) {
    const url = `${this.baseUrl}${this.adminPath}/store/object/${storeId}/${storeValue}`;
    const params = {
      headers: getAdminHeaders(),
      timeout: this.timeout
    };
    
    return http.get(url, params);
  }

  getStoresByID(storeId) {
    const url = `${this.baseUrl}${this.adminPath}/store/${storeId}`;
    const params = {
      headers: getAdminHeaders(),
      timeout: this.timeout
    };
    
    return http.get(url, params);
  }

  updateStore(storeData) {
    const url = `${this.baseUrl}${this.adminPath}/store`;
    const payload = JSON.stringify(storeData);
    const params = {
      headers: getAdminHeaders(),
      timeout: this.timeout
    };
    
    return http.put(url, payload, params);
  }

  deleteStore(storeId, storeValue) {
    const url = `${this.baseUrl}${this.adminPath}/store/object/${storeId}/${storeValue}`;
    const params = {
      headers: getAdminHeaders(),
      timeout: this.timeout
    };
    
    return http.del(url, null, params);
  }

  /**
   * Complete franchise workflow
   */
  executeFranchiseWorkflow(franchiseData) {
    const results = {
      create: null,
      get: null,
      update: null,
      list: null,
      delete: null
    };

    // Create franchise
    results.create = this.createFranchise(franchiseData);
    
    if (results.create.status === 201) {
      // Get franchise
      results.get = this.getFranchise(franchiseData.id);
      
      // Update franchise
      const updateData = { ...franchiseData, name: `${franchiseData.name} - Updated` };
      results.update = this.updateFranchise(updateData);
      
      // List franchises
      results.list = this.listFranchises();
      
      // Optionally delete franchise (commented out to avoid cleanup during load test)
      // results.delete = this.deleteFranchise(franchiseData.id);
    }

    return results;
  }

  /**
   * Complete store workflow
   */
  executeStoreWorkflow(storeData) {
    const results = {
      create: null,
      get: null,
      update: null,
      list: null,
      delete: null
    };

    // Create store
    results.create = this.createStore(storeData);
    
    if (results.create.status === 201) {
      // Get store
      results.get = this.getStore(storeData.id, storeData.value);
      
      // Update store
      const updateData = { ...storeData, name: `${storeData.name} - Updated` };
      results.update = this.updateStore(updateData);
      
      // List stores
      results.list = this.listStores();
      
      // Optionally delete store (commented out to avoid cleanup during load test)
      // results.delete = this.deleteStore(storeData.id, storeData.value);
    }

    return results;
  }

  /**
   * Batch operations for stress testing
   */
  createMultipleFranchises(franchiseList) {
    const results = [];
    
    franchiseList.forEach(franchise => {
      const response = this.createFranchise(franchise);
      results.push({
        franchise: franchise,
        response: response,
        success: response.status === 201
      });
    });
    
    return results;
  }

  createMultipleStores(storeList) {
    const results = [];
    
    storeList.forEach(store => {
      const response = this.createStore(store);
      results.push({
        store: store,
        response: response,
        success: response.status === 201
      });
    });
    
    return results;
  }

  /**
   * Error scenario testing
   */
  testUnauthorizedAccess() {
    const url = `${this.baseUrl}${this.adminPath}/franchise`;
    const params = {
      headers: { 'Content-Type': 'application/json' }, // No API key
      timeout: this.timeout
    };
    
    return http.get(url, params);
  }

  testInvalidFranchiseData() {
    const url = `${this.baseUrl}${this.adminPath}/franchise`;
    const invalidData = { invalidField: 'test' }; // Missing required fields
    const payload = JSON.stringify(invalidData);
    const params = {
      headers: getAdminHeaders(),
      timeout: this.timeout
    };
    
    return http.post(url, payload, params);
  }

  testNonExistentFranchise() {
    const url = `${this.baseUrl}${this.adminPath}/franchise/object/non-existent-franchise`;
    const params = {
      headers: getAdminHeaders(),
      timeout: this.timeout
    };
    
    return http.get(url, params);
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
      success: result.status >= 200 && result.status < 300
    };
  }

  /**
   * Validation helpers
   */
  validateResponse(response, expectedStatus = 200) {
    const validations = {
      'status is correct': response.status === expectedStatus,
      'response has body': response.body && response.body.length > 0,
      'response is JSON': this.isValidJSON(response.body),
      'response time acceptable': response.timings.duration < this.timeout
    };

    return check(response, validations);
  }

  isValidJSON(str) {
    try {
      JSON.parse(str);
      return true;
    } catch (e) {
      return false;
    }
  }
}