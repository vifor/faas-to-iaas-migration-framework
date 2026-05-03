// Functional validation — 2 endpoints FaaS PetStore API
// 1 VU · 1 iteration · sequential execution
//
// Run:
//   k6 run \
//     -e API_KEY=<key> \
//     -e COGNITO_PASSWORD=<password> \
//     scripts/functional-testing/functional-test.js

import http from 'k6/http';
import { check } from 'k6';
import {
  BASE_URL,
  API_KEY,
  TEST_JWT,
  COGNITO_ENDPOINT,
  COGNITO_CLIENT_ID,
  COGNITO_USERNAME,
  COGNITO_PASSWORD,
} from './config/environment.js';

export const options = {
  vus: 1,
  iterations: 1,
};

const STORE_ID = 'store-001';

// ── Helpers ───────────────────────────────────────────────────────────────────

function tryParseJson(body) {
  try { return JSON.parse(body); } catch (_) { return null; }
}

function printResult(passed, method, path, res, extra = {}) {
  const label    = passed ? 'PASS' : 'FAIL';
  const duration = res.timings.duration.toFixed(0);
  const parsed   = tryParseJson(res.body);

  console.log(`\n${label}  ${method} ${path}`);
  console.log(`      Status   : ${res.status}`);
  console.log(`      Duration : ${duration} ms`);
  console.log(`      Valid JSON: ${parsed !== null}`);

  for (const [k, v] of Object.entries(extra)) {
    console.log(`      ${k.padEnd(9)}: ${v}`);
  }

  if (parsed === null) {
    console.log(`      Body     : ${res.body.substring(0, 200)}`);
  }
}

// ── setup() — obtiene JWT de Cognito una sola vez ─────────────────────────────

export function setup() {
  console.log('\n── Authentication ───────────────────────────────────────────────');

  // If a pre-obtained JWT is provided (e.g. from run-smoke-test.sh), use it directly.
  if (TEST_JWT) {
    console.log(`PASS  Using pre-obtained JWT (${TEST_JWT.length} chars)`);
    return { idToken: TEST_JWT };
  }

  if (!COGNITO_PASSWORD) {
    console.error('FAIL  Either TEST_JWT or COGNITO_PASSWORD is required.');
    return { idToken: null };
  }

  console.log(`→ POST ${COGNITO_ENDPOINT}  (InitiateAuth for "${COGNITO_USERNAME}")`);

  const res = http.post(
    COGNITO_ENDPOINT,
    JSON.stringify({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: COGNITO_CLIENT_ID,
      AuthParameters: {
        USERNAME: COGNITO_USERNAME,
        PASSWORD: COGNITO_PASSWORD,
      },
    }),
    {
      headers: {
        'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
        'Content-Type': 'application/x-amz-json-1.1',
      },
    }
  );

  if (res.status !== 200) {
    const body = tryParseJson(res.body);
    const msg  = body ? (body.message || body.Message) : res.body.substring(0, 200);
    console.error(`FAIL  Cognito auth HTTP ${res.status}: ${msg}`);
    return { idToken: null };
  }

  const body    = tryParseJson(res.body);
  const idToken = body && body.AuthenticationResult && body.AuthenticationResult.IdToken;

  if (!idToken) {
    console.error(`FAIL  No IdToken in Cognito response. Keys: ${Object.keys(body || {}).join(', ')}`);
    return { idToken: null };
  }

  console.log(`PASS  JWT obtained (${idToken.length} chars)`);
  return { idToken };
}

// ── default() — ejecuta los 3 endpoints en secuencia ─────────────────────────

export default function (data) {
  console.log('\n════════════════════════════════════════════════════════════════');
  console.log(`  FaaS Functional Validation  |  BASE_URL: ${BASE_URL}`);
  console.log('════════════════════════════════════════════════════════════════');

  // ── Endpoint 1 — GET /admin/store/{storeId} ──────────────────────────────
  console.log('\n── [1/2] GET /admin/store/{storeId} — ApiKeyAuth ────────────────');

  if (!API_KEY) {
    console.error('FAIL  API_KEY is required. Add -e API_KEY=<key>');
  } else {
    const url1  = `${BASE_URL}/admin/store/${STORE_ID}`;
    console.log(`→ GET ${url1}`);

    const res1   = http.get(url1, {
      headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' },
    });
    const body1  = tryParseJson(res1.body);
    const pass1  = check(res1, {
      '[1] status is 200':        (r) => r.status === 200,
      '[1] response is JSON':     ()  => body1 !== null,
      '[1] response is an array': ()  => Array.isArray(body1),
    });

    printResult(pass1, 'GET', `/admin/store/${STORE_ID}`, res1, {
      'Is array': Array.isArray(body1),
      'Items':    Array.isArray(body1) ? body1.length : '-',
      'First':    Array.isArray(body1) && body1.length > 0
                    ? JSON.stringify(body1[0])
                    : '-',
    });
  }

  // ── Endpoint 2 — GET /store/{storeId}/pets ───────────────────────────────
  console.log('\n── [2/2] GET /store/{storeId}/pets — BearerAuth ─────────────────');

  if (!data.idToken) {
    console.error('FAIL  No JWT available — skipping endpoint 2');
  } else {
    const url2  = `${BASE_URL}/store/${STORE_ID}/pets`;
    console.log(`→ GET ${url2}`);

    const res2  = http.get(url2, {
      headers: {
        'Authorization': `Bearer ${data.idToken}`,
        'Content-Type': 'application/json',
      },
    });
    const body2 = tryParseJson(res2.body);
    const pass2 = check(res2, {
      '[2] status is 200':        (r) => r.status === 200,
      '[2] response is JSON':     ()  => body2 !== null,
      '[2] response is an array': ()  => Array.isArray(body2),
    });

    printResult(pass2, 'GET', `/store/${STORE_ID}/pets`, res2, {
      'Is array': Array.isArray(body2),
      'Items':    Array.isArray(body2) ? body2.length : '-',
    });
  }

  console.log('\n════════════════════════════════════════════════════════════════\n');
}
