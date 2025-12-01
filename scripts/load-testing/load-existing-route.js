import http from 'k6/http';
import { check, sleep } from 'k6';

// --------------------------------------------------------------------------------
// 1. CONFIGURACIÓN (Stages y Umbrales)
// --------------------------------------------------------------------------------
export const options = {
  // Definimos las fases de la prueba
  stages: [
    { duration: '30s', target: 5 },  // Rampa de subida: Llegar a 5 usuarios en 30s
    { duration: '1m', target: 5 },   // Meseta: Mantener 5 usuarios constantes por 1 minuto
    { duration: '30s', target: 0 },  // Rampa de bajada: Volver a 0 en 30s
  ],
  // Criterios de éxito (SLA para tu Tesis)
  thresholds: {
    http_req_failed: ['rate<0.01'],   // Menos del 1% de errores permitidos
    http_req_duration: ['p(95)<2000'], // El 95% de las peticiones deben ser menores a 2s (considerando Cold Starts)
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