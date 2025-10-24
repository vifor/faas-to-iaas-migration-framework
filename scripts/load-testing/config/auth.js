// Authentication utilities for K6 load tests
import http from 'k6/http';
import { check } from 'k6';
import { config } from './environment.js';

/**
 * JWT Token Cache to avoid unnecessary re-authentication
 */
class TokenCache {
  constructor() {
    this.tokens = new Map();
  }

  getToken(username) {
    const tokenData = this.tokens.get(username);
    if (!tokenData) return null;
    
    // Check if token is still valid (expires in 1 hour, refresh after 50 minutes)
    const now = Date.now();
    if (now - tokenData.timestamp > 50 * 60 * 1000) {
      this.tokens.delete(username);
      return null;
    }
    
    return tokenData.token;
  }

  setToken(username, token) {
    this.tokens.set(username, {
      token: token,
      timestamp: Date.now()
    });
  }

  clearToken(username) {
    this.tokens.delete(username);
  }

  clearAll() {
    this.tokens.clear();
  }
}

// Global token cache instance
const tokenCache = new TokenCache();

/**
 * Get API Key for admin operations
 */
export function getApiKey() {
  return config.admin.apiKey;
}

/**
 * Get admin headers with API key
 */
export function getAdminHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-api-key': getApiKey()
  };
}

/**
 * Authenticate user with Cognito and get JWT token
 * This is a simplified version - in reality, you'd use AWS Cognito SDK
 */
export function authenticateUser(username, password) {
  // Check cache first
  const cachedToken = tokenCache.getToken(username);
  if (cachedToken) {
    return cachedToken;
  }

  // For demo purposes, we'll simulate a Cognito authentication
  // In a real implementation, you would:
  // 1. Use AWS Cognito InitiateAuth API
  // 2. Handle the authentication flow
  // 3. Extract the JWT token from the response
  
  const authPayload = {
    username: username,
    password: password,
    clientId: config.store.cognito.clientId
  };

  // This is a placeholder - replace with actual Cognito authentication
  const authResponse = http.post(
    `${config.baseUrl}/auth/login`, // This endpoint doesn't exist in the OpenAPI
    JSON.stringify(authPayload),
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: config.store.timeout
    }
  );

  if (check(authResponse, { 'auth success': (r) => r.status === 200 })) {
    const responseBody = JSON.parse(authResponse.body);
    const token = responseBody.token || responseBody.accessToken;
    
    if (token) {
      tokenCache.setToken(username, token);
      return token;
    }
  }

  console.error(`Authentication failed for user ${username}: ${authResponse.status} ${authResponse.statusText}`);
  return null;
}

/**
 * Get JWT Bearer token for a test user
 */
export function getJwtToken(userIndex = 0) {
  const testUsers = config.store.cognito.testUsers;
  if (!testUsers || testUsers.length === 0) {
    throw new Error('No test users configured in environment');
  }

  const user = testUsers[userIndex % testUsers.length];
  return authenticateUser(user.username, user.password);
}

/**
 * Get store headers with JWT authentication
 */
export function getStoreHeaders(userIndex = 0) {
  const token = getJwtToken(userIndex);
  if (!token) {
    throw new Error(`Failed to get JWT token for user index ${userIndex}`);
  }

  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

/**
 * Get headers for a specific user by username
 */
export function getStoreHeadersForUser(username) {
  const testUsers = config.store.cognito.testUsers;
  const user = testUsers.find(u => u.username === username);
  
  if (!user) {
    throw new Error(`Test user ${username} not found in configuration`);
  }

  const token = authenticateUser(user.username, user.password);
  if (!token) {
    throw new Error(`Failed to authenticate user ${username}`);
  }

  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

/**
 * Refresh authentication for all users (useful between test iterations)
 */
export function refreshAllTokens() {
  tokenCache.clearAll();
  
  // Pre-authenticate all test users
  const testUsers = config.store.cognito.testUsers;
  testUsers.forEach(user => {
    try {
      authenticateUser(user.username, user.password);
    } catch (error) {
      console.warn(`Failed to pre-authenticate user ${user.username}:`, error);
    }
  });
}

/**
 * Get random test user
 */
export function getRandomTestUser() {
  const testUsers = config.store.cognito.testUsers;
  const randomIndex = Math.floor(Math.random() * testUsers.length);
  return testUsers[randomIndex];
}

/**
 * Get test user by role
 */
export function getTestUserByRole(role) {
  const testUsers = config.store.cognito.testUsers;
  const user = testUsers.find(u => u.role === role);
  return user || testUsers[0]; // fallback to first user
}

/**
 * Validate JWT token structure (basic validation)
 */
export function validateJwtToken(token) {
  if (!token || typeof token !== 'string') {
    return false;
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return false;
  }

  try {
    // Decode header and payload (skip signature validation for testing)
    const header = JSON.parse(atob(parts[0]));
    const payload = JSON.parse(atob(parts[1]));
    
    // Basic validation
    return header.alg && payload.exp && payload.iat;
  } catch (error) {
    return false;
  }
}

/**
 * Extract user info from JWT token
 */
export function extractUserFromToken(token) {
  if (!validateJwtToken(token)) {
    return null;
  }

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      username: payload.username || payload['cognito:username'],
      groups: payload['cognito:groups'] || [],
      email: payload.email,
      exp: payload.exp,
      iat: payload.iat
    };
  } catch (error) {
    console.error('Failed to extract user from token:', error);
    return null;
  }
}

/**
 * Authentication test scenario
 */
export function testAuthentication() {
  const results = {
    apiKey: false,
    jwtAuth: false,
    userCount: 0,
    errors: []
  };

  // Test API key
  try {
    const apiKey = getApiKey();
    results.apiKey = !!apiKey;
  } catch (error) {
    results.errors.push(`API Key test failed: ${error.message}`);
  }

  // Test JWT authentication for all users
  const testUsers = config.store.cognito.testUsers;
  let successfulAuths = 0;

  testUsers.forEach((user, index) => {
    try {
      const token = authenticateUser(user.username, user.password);
      if (token && validateJwtToken(token)) {
        successfulAuths++;
      } else {
        results.errors.push(`JWT authentication failed for user ${user.username}`);
      }
    } catch (error) {
      results.errors.push(`JWT test failed for user ${user.username}: ${error.message}`);
    }
  });

  results.jwtAuth = successfulAuths > 0;
  results.userCount = successfulAuths;

  return results;
}

/**
 * Cleanup authentication resources
 */
export function cleanupAuth() {
  tokenCache.clearAll();
}

// Base64 decode polyfill for environments that don't have atob
function atob(str) {
  if (typeof globalThis !== 'undefined' && globalThis.atob) {
    return globalThis.atob(str);
  }
  
  // Simple base64 decode implementation
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let result = '';
  let i = 0;
  
  str = str.replace(/[^A-Za-z0-9+/]/g, '');
  
  while (i < str.length) {
    const encoded1 = chars.indexOf(str.charAt(i++));
    const encoded2 = chars.indexOf(str.charAt(i++));
    const encoded3 = chars.indexOf(str.charAt(i++));
    const encoded4 = chars.indexOf(str.charAt(i++));
    
    const bitmap = (encoded1 << 18) | (encoded2 << 12) | (encoded3 << 6) | encoded4;
    
    result += String.fromCharCode((bitmap >> 16) & 255);
    if (encoded3 !== 64) result += String.fromCharCode((bitmap >> 8) & 255);
    if (encoded4 !== 64) result += String.fromCharCode(bitmap & 255);
  }
  
  return result;
}