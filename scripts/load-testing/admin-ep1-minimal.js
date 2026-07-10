import http from 'k6/http';
import { check, sleep } from 'k6';

// Required: -e API_KEY=your-faas-api-key
// Optional: -e BASE_URL=your-api-gateway-url -e STORE_ID=store-id
const BASE_URL = __ENV.BASE_URL || 'https://5brhnloiod.execute-api.sa-east-1.amazonaws.com/main';
const API_KEY = __ENV.API_KEY;
const STORE_ID = __ENV.STORE_ID || 'store-001';

if (!API_KEY) {
  throw new Error('API_KEY environment variable is required. Use: -e API_KEY=your-faas-api-key');
}

export const options = {
  stages: [
    { duration: '30s', target: 3 },
    { duration: '3m', target: 3 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    'http_req_duration': ['p(95)<3000'],
    'http_req_failed': ['rate<0.05'],
  },
};

export default function () {
  const response = http.get(`${BASE_URL}/admin/store/${STORE_ID}`, {
    headers: {
      'x-api-key': API_KEY,
    },
  });

  check(response, {
    'status is 200': (r) => r.status === 200,
    'no throttling': (r) => r.status !== 429,
  });

  if (response.status === 429) {
    console.error('🚨 THROTTLING DETECTED: HTTP 429');
  }

  sleep(1);
}