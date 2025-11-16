// Simple configuration for smoke tests
export function getConfig(env = 'development') {
  const configs = {
    development: {
      baseUrl: 'https://5brhnloiod.execute-api.sa-east-1.amazonaws.com/main',
      adminApiKey: '0e7da1c5-960f-4c69-9adf-fe176e1e35d4',
      timeout: 10000
    },
    production: {
      baseUrl: 'https://5brhnloiod.execute-api.sa-east-1.amazonaws.com/main',
      adminApiKey: '0e7da1c5-960f-4c69-9adf-fe176e1e35d4',
      timeout: 10000
    }
  };
  
  return configs[env] || configs.development;
}