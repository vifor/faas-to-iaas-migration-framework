import { config } from 'dotenv';
config(); // Carga las variables del .env

export function getConfig(env = process.env.NODE_ENV || 'development') {
  const baseConfig = {
    development: {
      baseUrl: process.env.API_BASE_URL_DEV || 'http://localhost:3000',
      adminApiKey: process.env.ADMIN_API_KEY, 
      timeout: 10000
    },
    production: {
      baseUrl: process.env.API_BASE_URL_PROD,
      adminApiKey: process.env.ADMIN_API_KEY,
      timeout: 10000
    }
  };
  return baseConfig[env];
}