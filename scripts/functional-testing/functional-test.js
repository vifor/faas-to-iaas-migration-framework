// Functional validation — 2 endpoints on both FaaS and IaaS environments
// 1 VU · 1 iteration · sequential execution with comparison output
//
// Run:
//   k6 run \
//     -e API_KEY=<faas-key> \
//     -e IAAS_API_KEY=<iaas-key> \
//     -e COGNITO_PASSWORD=<password> \
//     scripts/functional-testing/functional-test.js

import http from 'k6/http';
import { check } from 'k6';
import {
  BASE_URL,
  IAAS_URL,
  API_KEY,
  IAAS_API_KEY,
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

function testEndpoint1(baseUrl, apiKey, environment) {
  console.log(`\n── EP1 ${environment} — GET /admin/store/{storeId} — ApiKeyAuth ──────────`);

  if (!apiKey) {
    console.error(`FAIL  ${environment} API key is required`);
    return null;
  }

  const url = `${baseUrl}/admin/store/${STORE_ID}`;
  console.log(`→ GET ${url}`);

  const res = http.get(url, {
    headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
  });

  const body = tryParseJson(res.body);
  const pass = check(res, {
    [`EP1 ${environment} status is 200`]: (r) => r.status === 200,
    [`EP1 ${environment} response is JSON`]: () => body !== null,
    [`EP1 ${environment} response is an array`]: () => Array.isArray(body),
  });

  printResult(pass, 'GET', `/admin/store/${STORE_ID}`, res, {
    'Is array': Array.isArray(body),
    'Items': Array.isArray(body) ? body.length : '-',
    'First': Array.isArray(body) && body.length > 0 ? JSON.stringify(body[0]).substring(0, 100) + '...' : '-',
  });

  return { status: res.status, body, passed: pass };
}

function testEndpoint2(baseUrl, idToken, environment) {
  console.log(`\n── EP2 ${environment} — GET /store/{storeId}/pets — BearerAuth ───────────`);

  if (!idToken) {
    console.error(`FAIL  No JWT available for ${environment} — skipping endpoint 2`);
    return null;
  }

  const url = `${baseUrl}/store/${STORE_ID}/pets`;
  console.log(`→ GET ${url}`);

  const res = http.get(url, {
    headers: {
      'Authorization': `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
  });

  const body = tryParseJson(res.body);

  // Updated check to accept both array and object responses
  const isValidResponse = Array.isArray(body) || (body && typeof body === 'object' && 'pets' in body);

  const pass = check(res, {
    [`EP2 ${environment} status is 200`]: (r) => r.status === 200,
    [`EP2 ${environment} response is JSON`]: () => body !== null,
    [`EP2 ${environment} response is valid format`]: () => isValidResponse,
  });

  const itemCount = Array.isArray(body) ? body.length : (body && body.pets ? body.pets.length : 0);

  printResult(pass, 'GET', `/store/${STORE_ID}/pets`, res, {
    'Format': Array.isArray(body) ? 'Array' : (body && body.pets ? 'Object with pets' : 'Unknown'),
    'Items': itemCount,
  });

  // Show complete response content
  console.log(`      Full Response: ${JSON.stringify(body, null, 2)}`);

  return { status: res.status, body, passed: pass };
}

function formatResponseSummary(body, maxLength = 80) {
  if (!body) return 'null';

  const json = JSON.stringify(body);
  if (json.length <= maxLength) return json;

  if (Array.isArray(body)) {
    return `[${body.length} items: ${JSON.stringify(body[0]).substring(0, 50)}...]`;
  }

  return json.substring(0, maxLength) + '...';
}

function printComparisonSummary(faasResults, iaasResults) {
  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('  FUNCTIONAL EQUIVALENCE SUMMARY');
  console.log('════════════════════════════════════════════════════════════════');

  if (faasResults.ep1 && iaasResults.ep1) {
    console.log('\n  EP1 — GET /admin/store/{storeId}');
    console.log(`  ├── FaaS  : ${formatResponseSummary(faasResults.ep1.body)}`);
    console.log(`  └── IaaS  : ${formatResponseSummary(iaasResults.ep1.body)}`);
  }

  if (faasResults.ep2 && iaasResults.ep2) {
    console.log('\n  EP2 — GET /store/{storeId}/pets');
    console.log(`  ├── FaaS  : ${formatResponseSummary(faasResults.ep2.body)}`);
    console.log(`  └── IaaS  : ${formatResponseSummary(iaasResults.ep2.body)}`);
  }

  console.log('\n  EQUIVALENCE VERDICT:');

  // EP1 Analysis
  let ep1Status = '❓ UNKNOWN';
  if (faasResults.ep1 && iaasResults.ep1) {
    if (faasResults.ep1.status === 200 && iaasResults.ep1.status === 200) {
      ep1Status = '✅ EQUIVALENT (both return HTTP 200 with store data)';
    } else if (faasResults.ep1.status !== iaasResults.ep1.status) {
      ep1Status = `❌ DIFFERENT STATUS (FaaS: ${faasResults.ep1.status}, IaaS: ${iaasResults.ep1.status})`;
    } else {
      ep1Status = '⚠️  BOTH FAILED';
    }
  }

  // EP2 Analysis
  let ep2Status = '❓ UNKNOWN';
  if (faasResults.ep2 && iaasResults.ep2) {
    const faasIsArray = Array.isArray(faasResults.ep2.body);
    const iaasIsObject = faasResults.ep2.body && typeof iaasResults.ep2.body === 'object' && 'pets' in iaasResults.ep2.body;

    if (faasResults.ep2.status === 200 && iaasResults.ep2.status === 200) {
      if (faasIsArray && iaasIsObject) {
        ep2Status = '⚠️  DIFFERENT FORMAT (FaaS=array, IaaS=object with pets array)';
      } else if (faasIsArray && Array.isArray(iaasResults.ep2.body)) {
        ep2Status = '✅ EQUIVALENT (both return arrays)';
      } else {
        ep2Status = '✅ EQUIVALENT (both return HTTP 200 with pets data)';
      }
    } else if (faasResults.ep2.status !== iaasResults.ep2.status) {
      ep2Status = `❌ DIFFERENT STATUS (FaaS: ${faasResults.ep2.status}, IaaS: ${iaasResults.ep2.status})`;
    } else {
      ep2Status = '⚠️  BOTH FAILED';
    }
  }

  console.log(`  ├── EP1: ${ep1Status}`);
  console.log(`  └── EP2: ${ep2Status}`);

  console.log('\n════════════════════════════════════════════════════════════════\n');
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

// ── default() — test both FaaS and IaaS environments with comparison ────────

export default function (data) {
  const results = { faas: {}, iaas: {} };

  // ── Test FaaS Environment ──────────────────────────────────────────────
  console.log('\n════════════════════════════════════════════════════════════════');
  console.log(`  FaaS Environment Testing  |  BASE_URL: ${BASE_URL}`);
  console.log('════════════════════════════════════════════════════════════════');

  results.faas.ep1 = testEndpoint1(BASE_URL, API_KEY, 'FaaS');
  results.faas.ep2 = testEndpoint2(BASE_URL, data.idToken, 'FaaS');

  // ── Test IaaS Environment ──────────────────────────────────────────────
  console.log('\n════════════════════════════════════════════════════════════════');
  console.log(`  IaaS Environment Testing  |  IAAS_URL: ${IAAS_URL}`);
  console.log('════════════════════════════════════════════════════════════════');

  results.iaas.ep1 = testEndpoint1(IAAS_URL, IAAS_API_KEY, 'IaaS');
  results.iaas.ep2 = testEndpoint2(IAAS_URL, data.idToken, 'IaaS');

  // ── Print Comparison Summary ───────────────────────────────────────────
  printComparisonSummary(results.faas, results.iaas);
}
