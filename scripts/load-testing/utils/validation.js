// Response validation utilities for K6 load tests
import { check } from 'k6';

/**
 * Standard HTTP status code validators
 */
export const StatusValidators = {
  isSuccess: (response) => response.status >= 200 && response.status < 300,
  isClientError: (response) => response.status >= 400 && response.status < 500,
  isServerError: (response) => response.status >= 500,
  isOk: (response) => response.status === 200,
  isCreated: (response) => response.status === 201,
  isBadRequest: (response) => response.status === 400,
  isUnauthorized: (response) => response.status === 401,
  isForbidden: (response) => response.status === 403,
  isNotFound: (response) => response.status === 404,
  isServerUnavailable: (response) => response.status === 503
};

/**
 * Response content validators
 */
export class ResponseValidator {
  static validateJson(response, description = 'response') {
    const checks = {};
    checks[`${description} is JSON`] = (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch (e) {
        return false;
      }
    };
    return check(response, checks);
  }

  static validateSchema(response, schema, description = 'response') {
    const checks = {};
    checks[`${description} matches schema`] = (r) => {
      try {
        const data = JSON.parse(r.body);
        return this.matchesSchema(data, schema);
      } catch (e) {
        return false;
      }
    };
    return check(response, checks);
  }

  static validateStatusAndJson(response, expectedStatus = 200, description = 'response') {
    const checks = {};
    checks[`${description} status is ${expectedStatus}`] = (r) => r.status === expectedStatus;
    checks[`${description} is JSON`] = (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch (e) {
        return false;
      }
    };
    return check(response, checks);
  }

  static validateErrorResponse(response, expectedStatus, description = 'error response') {
    const checks = {};
    checks[`${description} status is ${expectedStatus}`] = (r) => r.status === expectedStatus;
    checks[`${description} has error field`] = (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.hasOwnProperty('error') || data.hasOwnProperty('message');
      } catch (e) {
        return false;
      }
    };
    return check(response, checks);
  }

  static matchesSchema(data, schema) {
    if (!schema || !data) return false;

    // Simple schema validation - in production, use a proper JSON schema validator
    for (const [key, type] of Object.entries(schema)) {
      if (schema.required && schema.required.includes(key) && !data.hasOwnProperty(key)) {
        return false;
      }
      
      if (data.hasOwnProperty(key)) {
        const value = data[key];
        if (!this.validateType(value, type)) {
          return false;
        }
      }
    }
    return true;
  }

  static validateType(value, expectedType) {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number';
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      default:
        return true;
    }
  }
}

/**
 * Admin endpoint validators
 */
export class AdminValidators {
  static validateFranchiseList(response) {
    const checks = {
      'franchise list status is 200': (r) => r.status === 200,
      'franchise list is JSON': (r) => {
        try {
          JSON.parse(r.body);
          return true;
        } catch (e) {
          return false;
        }
      },
      'franchise list is array': (r) => {
        try {
          const data = JSON.parse(r.body);
          return Array.isArray(data);
        } catch (e) {
          return false;
        }
      }
    };
    return check(response, checks);
  }

  static validateFranchiseCreate(response) {
    const checks = {
      'franchise create status is 201': (r) => r.status === 201,
      'franchise create has success message': (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.success && data.success.includes('succeed');
        } catch (e) {
          return false;
        }
      }
    };
    return check(response, checks);
  }

  static validateFranchiseGet(response, franchiseId) {
    const checks = {
      'franchise get status is 200': (r) => r.status === 200,
      'franchise get has ID': (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.id === franchiseId;
        } catch (e) {
          return false;
        }
      },
      'franchise get has name': (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.name && typeof data.name === 'string';
        } catch (e) {
          return false;
        }
      }
    };
    return check(response, checks);
  }

  static validateStoreList(response) {
    const checks = {
      'store list status is 200': (r) => r.status === 200,
      'store list is JSON': (r) => {
        try {
          JSON.parse(r.body);
          return true;
        } catch (e) {
          return false;
        }
      },
      'store list is array': (r) => {
        try {
          const data = JSON.parse(r.body);
          return Array.isArray(data);
        } catch (e) {
          return false;
        }
      }
    };
    return check(response, checks);
  }

  static validateStoreCreate(response) {
    const checks = {
      'store create status is 201': (r) => r.status === 201,
      'store create has success message': (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.success && data.success.includes('succeed');
        } catch (e) {
          return false;
        }
      }
    };
    return check(response, checks);
  }

  static validateStoreGet(response, storeId) {
    const checks = {
      'store get status is 200': (r) => r.status === 200,
      'store get has ID': (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.id === storeId;
        } catch (e) {
          return false;
        }
      },
      'store get has value': (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.value && typeof data.value === 'string';
        } catch (e) {
          return false;
        }
      }
    };
    return check(response, checks);
  }
}

/**
 * Store endpoint validators (with authorization)
 */
export class StoreValidators {
  static validateAuthorizedResponse(response, expectedDecision = 'ALLOW') {
    const checks = {
      'store operation status is 200': (r) => r.status === 200,
      'store operation is JSON': (r) => {
        try {
          JSON.parse(r.body);
          return true;
        } catch (e) {
          return false;
        }
      },
      [`store operation decision is ${expectedDecision}`]: (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.decision === expectedDecision;
        } catch (e) {
          return false;
        }
      },
      'store operation has message': (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.message && typeof data.message === 'string';
        } catch (e) {
          return false;
        }
      }
    };
    return check(response, checks);
  }

  static validateDeniedResponse(response) {
    return this.validateAuthorizedResponse(response, 'DENY');
  }

  static validatePetSearch(response) {
    const baseValidation = this.validateAuthorizedResponse(response);
    const additionalChecks = {
      'pet search message contains pets': (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.message.toLowerCase().includes('pets');
        } catch (e) {
          return false;
        }
      }
    };
    return baseValidation && check(response, additionalChecks);
  }

  static validatePetCreate(response) {
    const baseValidation = this.validateAuthorizedResponse(response);
    const additionalChecks = {
      'pet create message contains create': (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.message.toLowerCase().includes('create');
        } catch (e) {
          return false;
        }
      }
    };
    return baseValidation && check(response, additionalChecks);
  }

  static validateOrderList(response) {
    const baseValidation = this.validateAuthorizedResponse(response);
    const additionalChecks = {
      'order list message contains orders': (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.message.toLowerCase().includes('orders');
        } catch (e) {
          return false;
        }
      }
    };
    return baseValidation && check(response, additionalChecks);
  }

  static validateOrderCreate(response) {
    const baseValidation = this.validateAuthorizedResponse(response);
    const additionalChecks = {
      'order create message contains create': (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.message.toLowerCase().includes('create');
        } catch (e) {
          return false;
        }
      }
    };
    return baseValidation && check(response, additionalChecks);
  }

  static validateInventory(response) {
    const baseValidation = this.validateAuthorizedResponse(response);
    const additionalChecks = {
      'inventory message contains inventory': (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.message.toLowerCase().includes('inventory');
        } catch (e) {
          return false;
        }
      }
    };
    return baseValidation && check(response, additionalChecks);
  }
}

/**
 * Performance validators
 */
export class PerformanceValidators {
  static validateResponseTime(response, maxTime, description = 'response') {
    const checks = {};
    checks[`${description} time under ${maxTime}ms`] = (r) => r.timings.duration < maxTime;
    return check(response, checks);
  }

  static validateNoTimeout(response, description = 'response') {
    const checks = {};
    checks[`${description} did not timeout`] = (r) => r.status !== 0;
    return check(response, checks);
  }

  static validateThroughput(response, minThroughput, description = 'response') {
    const bodySize = response.body ? response.body.length : 0;
    const duration = response.timings.duration / 1000; // Convert to seconds
    const throughput = bodySize / duration;
    
    const checks = {};
    checks[`${description} throughput above ${minThroughput} bytes/sec`] = () => throughput > minThroughput;
    return check(response, checks);
  }
}

/**
 * Authentication validators
 */
export class AuthValidators {
  static validateApiKeyRequired(response) {
    const checks = {
      'api key required returns 403': (r) => r.status === 403,
      'api key error message': (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.error && data.error.toLowerCase().includes('key');
        } catch (e) {
          return false;
        }
      }
    };
    return check(response, checks);
  }

  static validateJwtRequired(response) {
    const checks = {
      'jwt required returns 403': (r) => r.status === 403,
      'jwt error message': (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.error && data.error.toLowerCase().includes('token');
        } catch (e) {
          return false;
        }
      }
    };
    return check(response, checks);
  }

  static validateTokenExpired(response) {
    const checks = {
      'expired token returns 403': (r) => r.status === 403,
      'expired token error message': (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.error && data.error.toLowerCase().includes('expired');
        } catch (e) {
          return false;
        }
      }
    };
    return check(response, checks);
  }
}

/**
 * Business logic validators
 */
export class BusinessValidators {
  static validateFranchiseBusinessRules(franchiseData) {
    const checks = {
      'franchise has valid id format': () => {
        return franchiseData.id && franchiseData.id.startsWith('franchise-');
      },
      'franchise has non-empty name': () => {
        return franchiseData.name && franchiseData.name.trim().length > 0;
      },
      'franchise has valid location': () => {
        return franchiseData.location && franchiseData.location.trim().length > 0;
      }
    };
    return check(null, checks);
  }

  static validateStoreBusinessRules(storeData) {
    const checks = {
      'store has valid id format': () => {
        return storeData.id && storeData.id.startsWith('store-');
      },
      'store has valid value': () => {
        return storeData.value && ['main', 'branch', 'outlet'].includes(storeData.value);
      },
      'store has non-empty name': () => {
        return storeData.name && storeData.name.trim().length > 0;
      },
      'store has valid address': () => {
        return storeData.address && storeData.address.trim().length > 0;
      }
    };
    return check(null, checks);
  }

  static validatePetBusinessRules(petData) {
    const checks = {
      'pet has non-empty name': () => {
        return petData.name && petData.name.trim().length > 0;
      },
      'pet has valid species': () => {
        return petData.species && ['Dog', 'Cat', 'Bird', 'Fish', 'Rabbit', 'Hamster'].includes(petData.species);
      },
      'pet has positive age': () => {
        return petData.age && petData.age > 0;
      },
      'pet has positive price': () => {
        return petData.price && petData.price > 0;
      },
      'pet has valid status': () => {
        return petData.status && ['available', 'pending', 'sold'].includes(petData.status);
      }
    };
    return check(null, checks);
  }

  static validateOrderBusinessRules(orderData) {
    const checks = {
      'order has pet id': () => {
        return orderData.petId && orderData.petId.trim().length > 0;
      },
      'order has positive quantity': () => {
        return orderData.quantity && orderData.quantity > 0;
      },
      'order has customer id': () => {
        return orderData.customerId && orderData.customerId.trim().length > 0;
      }
    };
    return check(null, checks);
  }
}

/**
 * Comprehensive validation helper
 */
export class ValidationHelper {
  static validateResponse(response, validatorConfig) {
    let allValidationsPassed = true;

    // Status validation
    if (validatorConfig.expectedStatus) {
      const statusCheck = check(response, {
        [`status is ${validatorConfig.expectedStatus}`]: (r) => r.status === validatorConfig.expectedStatus
      });
      allValidationsPassed = allValidationsPassed && statusCheck;
    }

    // JSON validation
    if (validatorConfig.expectJson) {
      const jsonCheck = ResponseValidator.validateJson(response, validatorConfig.description);
      allValidationsPassed = allValidationsPassed && jsonCheck;
    }

    // Schema validation
    if (validatorConfig.schema) {
      const schemaCheck = ResponseValidator.validateSchema(response, validatorConfig.schema, validatorConfig.description);
      allValidationsPassed = allValidationsPassed && schemaCheck;
    }

    // Performance validation
    if (validatorConfig.maxResponseTime) {
      const perfCheck = PerformanceValidators.validateResponseTime(response, validatorConfig.maxResponseTime, validatorConfig.description);
      allValidationsPassed = allValidationsPassed && perfCheck;
    }

    // Custom validations
    if (validatorConfig.customChecks) {
      const customCheck = check(response, validatorConfig.customChecks);
      allValidationsPassed = allValidationsPassed && customCheck;
    }

    return allValidationsPassed;
  }

  static createValidationSummary(testName, validationResults) {
    const summary = {
      testName,
      totalValidations: validationResults.length,
      passed: validationResults.filter(r => r.passed).length,
      failed: validationResults.filter(r => !r.passed).length,
      passRate: 0,
      details: validationResults
    };

    summary.passRate = summary.totalValidations > 0 ? 
      (summary.passed / summary.totalValidations) * 100 : 0;

    return summary;
  }
}