import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    // 1. Rampa de subida (Warm up): De 0 a 10 usuarios en 1 minuto.
    // Esto permite que AWS vaya provisionando Lambdas progresivamente.
    { duration: '1m', target: 10 }, 
    
    // 2. Meseta (Steady State): Mantener 10 usuarios por 4 minutos.
    // AQUÍ es donde mides el rendimiento real "en caliente".
    { duration: '4m', target: 10 }, 
    
    // 3. Bajada (Cool down): Volver a 0 en 30 segundos.
    { duration: '30s', target: 0 }, 
  ],
  
  thresholds: {
    // Somos un poco más tolerantes con el p(95) global por los cold starts,
    // pero exigentes con los errores.
    http_req_failed: ['rate<0.01'], 
    http_req_duration: ['p(95)<2000'], 
  },
};

const config = {
  baseUrl: 'https://5brhnloiod.execute-api.sa-east-1.amazonaws.com/main',
  clientId: '34uf0bee83j3ciq8sd7durq31k',
  apiKey: '0e7da1c5-960f-4c69-9adf-fe176e1e35d4', // 🔴 TU API KEY REAL
  authUrl: 'https://cognito-idp.sa-east-1.amazonaws.com/',
  user: { username: 'vicky', password: 'tesis1512_' }
};

// --------------------------------------------------------------------------------
// 2. SETUP (Se ejecuta UNA vez al principio)
// --------------------------------------------------------------------------------
export function setup() {
  console.log('🔑 Iniciando autenticación (Setup)...');
  
  const authPayload = JSON.stringify({
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: config.clientId,
    AuthParameters: {
      USERNAME: config.user.username,
      PASSWORD: config.user.password
    }
  });

  const authHeaders = {
    'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
    'Content-Type': 'application/x-amz-json-1.1'
  };

  const res = http.post(config.authUrl, authPayload, { headers: authHeaders });
  
  if (res.status !== 200) {
    throw new Error(`Fallo en autenticación: ${res.body}`);
  }

  const token = JSON.parse(res.body).AuthenticationResult.IdToken;
  console.log('✅ Token obtenido y compartido para la prueba.');
  return { idToken: token }; // Pasamos el token a los VUs
}

// --------------------------------------------------------------------------------
// 3. VIRTUAL USER CODE (Lo que hace cada usuario simulado)
// --------------------------------------------------------------------------------
export default function (data) {
  // data contiene lo que retornamos en setup()
  const params = {
    headers: {
      'Authorization': `Bearer ${data.idToken}`,
      'x-api-key': config.apiKey,
      'Content-Type': 'application/json',
    },
  };

  const res = http.get(`${config.baseUrl}/admin/store/store-001`, params);

  check(res, {
    'status is 200': (r) => r.status === 200,
  });

  // Pausa aleatoria entre 0.5 y 1.5 segundos para simular comportamiento humano (Think Time)
  sleep(Math.random() * 1 + 0.5); 
}