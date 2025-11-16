# IaaS Testing Configuration

## Prerequisites

Before running IaaS tests, ensure the following:

### 1. NestJS Application Running

```bash
# Navigate to monolith app directory
cd src/monolith-app

# Install dependencies
npm install

# Start the application in development mode
npm run start:dev

# Or using Docker
docker-compose up --build
```

The application should be accessible at: `http://localhost:3000`

### 2. Test User Configuration

Create a test user in the system or ensure the following user exists:

```json
{
  "email": "owner@store1.petstore.com",
  "password": "SecurePassword123!",
  "role": "store_owner",
  "storeId": "store-001",
  "status": "active"
}
```

### 3. Database Setup

Ensure DynamoDB tables are created and accessible:

- Local DynamoDB: `http://localhost:8000`
- Tables: `petstoreTenants`, user tables, etc.

### 4. Environment Configuration

Create `.env` file in monolith-app directory:

```env
NODE_ENV=development
PORT=3000
JWT_SECRET=petstore-secret-key-change-in-production
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=refresh-secret-key
JWT_REFRESH_EXPIRES_IN=7d
AWS_REGION=sa-east-1
DYNAMODB_ENDPOINT=http://localhost:8000
```

## Available Tests

### 1. Authentication Flow Test

```bash
k6 run iaas/iaas-auth-flow.js
```

**Purpose**: Verify complete authentication flow
**Duration**: ~5 seconds
**Users**: 1 VU

### 2. Load Test with Caching

```bash
k6 run iaas/iaas-load-test.js
```

**Purpose**: Performance test with token caching
**Duration**: ~90 seconds
**Load Pattern**: Ramp 1→10→50→10→0 users

### 3. Comprehensive Test Suite

```bash
k6 run iaas/iaas-test-suite.js
```

**Purpose**: Multi-scenario testing
**Duration**: ~3 minutes
**Scenarios**: Auth performance, API performance, mixed workload

### 4. FaaS vs IaaS Comparison

```bash
k6 run comparison/faas-vs-iaas.js
```

**Purpose**: Direct performance comparison
**Duration**: ~3 minutes
**Requirement**: Both FaaS and IaaS environments running

## Expected Performance Characteristics

### IaaS (NestJS) Expected Performance:

- **Authentication**: 5-50ms (local JWT verification)
- **API Requests**: 30-150ms (no cold start)
- **Throughput**: High concurrent requests
- **Error Rate**: <1% under normal load

### Comparison with FaaS:

- **Latency**: IaaS should be 10-20x faster
- **Consistency**: More predictable response times
- **Throughput**: Higher requests per second
- **Resource Usage**: Constant resource consumption

## Test Endpoints

### Authentication Endpoints:

- `POST /api/v1/auth/login` - User login
- `GET /api/v1/auth/validate` - Token validation
- `GET /api/v1/auth/profile` - User profile

### Business Logic Endpoints:

- `GET /api/v1/store/{storeId}/pets` - List pets in store
- `POST /api/v1/store/{storeId}/pet/create` - Create pet
- `GET /api/v1/store/{storeId}/pet/get/{petId}` - Get specific pet
- `PUT /api/v1/store/{storeId}/pet/update/{petId}` - Update pet

## Troubleshooting

### Common Issues:

1. **Connection Refused**

   - Ensure NestJS app is running on port 3000
   - Check Docker containers are up

2. **Authentication Failed**

   - Verify test user exists in database
   - Check password and credentials

3. **Database Errors**

   - Ensure DynamoDB Local is running
   - Check table creation scripts

4. **Performance Issues**
   - Monitor application logs
   - Check system resources (CPU, Memory)
   - Verify database connection pool settings

### Debug Commands:

```bash
# Check application health
curl http://localhost:3000/api/v1/health

# Test login manually
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@store1.petstore.com","password":"SecurePassword123!"}'

# View application logs
docker-compose logs nestjs-app

# Check DynamoDB tables
docker-compose logs dynamodb-local
```

## Performance Monitoring

### Key Metrics to Track:

- **Response Time**: p50, p95, p99 percentiles
- **Throughput**: Requests per second
- **Error Rate**: Failed requests percentage
- **Resource Usage**: CPU, Memory, Database connections

### Tools:

- K6 built-in metrics
- Application logs
- Docker stats
- System monitoring tools

## Test Results Location

Test results are saved in:

- Console output (real-time)
- K6 JSON/HTML reports (if configured)
- Application logs for detailed debugging
