import http from 'k6/http';
import { check, sleep } from 'k6';

// --------------------------------------------------------------------------------
// CONFIGURACIÓN DE PICO (SPIKE)
// --------------------------------------------------------------------------------
export const options = {
  stages: [
    { duration: '1m', target: 2 },   // 1. Calentamiento suave (Línea base)
    { duration: '10s', target: 50 }, // 2. EL PICO: ¡De 2 a 50 usuarios en 10s! 🚀
    { duration: '1m', target: 50 },  // 3. Sostener la carga (Estrés máximo)
    { duration: '1m', target: 2 },   // 4. Recuperación (Ver si el sistema vuelve a la normalidad)
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],    // Toleramos hasta 5% de errores (es una prueba dura)
    http_req_duration: ['p(95)<3000'], // Toleramos hasta 3s de latencia en el caos
  },
};

const config = {
  baseUrl: 'https://5brhnloiod.execute-api.sa-east-1.amazonaws.com/main',
  clientId: '34uf0bee83j3ciq8sd7durq31k',
  apiKey: '0e7da1c5-960f-4c69-9adf-fe176e1e35d4', // 🔴 API KEY
  authUrl: 'https://cognito-idp.sa-east-1.amazonaws.com/',
  user: { username: 'vicky', password: 'tesis1512_' }
};

// ... (El bloque setup() y default() es IDÉNTICO al del load-test-api.js) ...
// Copia y pega el setup() y default() del script anterior aquí.
// Solo cambia la sección de 'options' de arriba.

export function setup() {
  // ... Copiar del script anterior ...
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
  if (res.status !== 200) throw new Error(`Fallo Auth: ${res.body}`);
  return { idToken: JSON.parse(res.body).AuthenticationResult.IdToken };
}

export default function (data) {
  const params = {
    headers: {
      'Authorization': `Bearer ${data.idToken}`,
      'x-api-key': config.apiKey,
      'Content-Type': 'application/json',
    },
  };
  const res = http.get(`${config.baseUrl}/admin/store/store-001`, params);
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(Math.random() * 1 + 0.5); 
}