# K6 Load Testing Configuration for PetStore FaaS Application

This directory contains comprehensive K6 load testing configurations for the PetStore FaaS application, designed to test both administrative and store operations with proper authentication and authorization flows.

## Prerequisites

### 1. Install K6

#### Windows (Chocolatey)

```powershell
choco install k6
```

#### Windows (Winget)

```powershell
winget install k6
```

#### macOS (Homebrew)

```bash
brew install k6
```

#### Linux (Package managers)

```bash
# Ubuntu/Debian
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### 2. Configure Environment

Copy `config/environment.example.js` to `config/environment.js` and update with your actual values:

```javascript
cp config/environment.example.js config/environment.js
```

## Test Types

### 1. Smoke Tests

- **Purpose**: Basic functionality validation
- **Duration**: 30 seconds
- **Users**: 1-2 VUs
- **Command**: `npm run test:smoke`

### 2. Load Tests

- **Purpose**: Normal expected load
- **Duration**: 5 minutes
- **Users**: 10-50 VUs
- **Command**: `npm run test:load`

### 3. Stress Tests

- **Purpose**: Beyond normal capacity
- **Duration**: 10 minutes
- **Users**: 50-100 VUs
- **Command**: `npm run test:stress`

### 4. Spike Tests

- **Purpose**: Sudden traffic spikes
- **Duration**: 5 minutes
- **Users**: 1-200 VUs (rapid ramp)
- **Command**: `npm run test:spike`

## Specialized Tests

### Administrative Operations

Tests all admin endpoints with API key authentication:

```bash
npm run test:admin
```

### Store Operations

Tests store endpoints with JWT authentication:

```bash
npm run test:store
```

### Mixed Workload

Simulates realistic mixed usage patterns:

```bash
npm run test:mixed
```

### Authentication Flow

Tests complete authentication flows:

```bash
npm run test:auth
```

## Configuration Files

### Test Configurations

- `smoke-test.json`: Minimal load smoke test
- `load-test.json`: Normal load test
- `stress-test.json`: High load stress test
- `spike-test.json`: Traffic spike test

### Environment Configuration

- `config/environment.js`: Environment-specific settings
- `config/auth.js`: Authentication configuration
- `config/test-data.js`: Test data generators

### Utility Scripts

- `utils/auth-helper.js`: Authentication utilities
- `utils/data-generator.js`: Test data generation
- `utils/validation.js`: Response validation
- `utils/metrics.js`: Custom metrics collection

## Test Scenarios

### 1. Admin Franchise Management

- Create franchise
- List franchises
- Get franchise by ID
- Update franchise
- Delete franchise

### 2. Admin Store Management

- Create store
- List stores
- Get store by ID
- Update store
- Delete store

### 3. Store Pet Operations

- Search pets
- Add new pet
- Get pet details
- Update pet information

### 4. Store Order Management

- List orders
- Place new order
- Get order details
- Cancel order

### 5. Store Inventory

- Get inventory status

## Authentication

### API Key Authentication (Admin)

- Configure `API_KEY` in environment
- Used for all `/admin/*` endpoints

### JWT Bearer Authentication (Store)

- Configure Cognito credentials in environment
- Automatic token refresh
- Used for all `/store/*` endpoints

## Metrics and Monitoring

### Built-in K6 Metrics

- `http_req_duration`: Request response time
- `http_req_failed`: Request failure rate
- `http_reqs`: Request rate
- `vus`: Active virtual users

### Custom Metrics

- `admin_operation_duration`: Admin endpoint response times
- `store_operation_duration`: Store endpoint response times
- `auth_success_rate`: Authentication success rate
- `business_transactions`: Business operation success rate

## Results and Reporting

### Console Output

Real-time metrics during test execution

### Summary Report

Detailed summary at test completion

### HTML Reports (Optional)

Export results for detailed analysis:

```bash
k6 run --out json=results.json test-suite.js
```

## Best Practices

### 1. Environment Isolation

- Use separate environments for testing
- Configure appropriate base URLs
- Use test-specific data

### 2. Gradual Load Increase

- Start with smoke tests
- Gradually increase load
- Monitor system behavior

### 3. Realistic Scenarios

- Mix different operations
- Use realistic data patterns
- Include error scenarios

### 4. Monitoring

- Monitor both K6 metrics and application metrics
- Watch for AWS Lambda cold starts
- Check API Gateway throttling

## Troubleshooting

### Common Issues

#### Authentication Failures

- Verify API keys and JWT tokens
- Check token expiration
- Validate Cognito configuration

#### Network Timeouts

- Adjust timeout settings in configuration
- Check AWS Lambda cold start times
- Verify API Gateway limits

#### Rate Limiting

- Monitor API Gateway throttling
- Adjust test load accordingly
- Implement proper error handling

#### Invalid Responses

- Verify endpoint URLs
- Check request payload formats
- Validate OpenAPI specification compliance

## Examples

### Quick Smoke Test

```bash
# Run a quick 30-second smoke test
npm run test:smoke
```

### Production Load Test

```bash
# Run a 5-minute load test simulating normal usage
npm run test:load
```

### Stress Testing

```bash
# Run a 10-minute stress test to find breaking points
npm run test:stress
```

### Custom Test

```bash
# Run a specific test file with custom configuration
k6 run --config custom-config.json custom-test.js
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Load Tests
on:
  schedule:
    - cron: "0 2 * * *" # Daily at 2 AM
  workflow_dispatch:

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install K6
        run: |
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6
      - name: Run Load Tests
        run: |
          cd scripts/load-testing
          npm run test:load
```

## Support

For issues and questions:

1. Check the troubleshooting section
2. Review K6 documentation: https://k6.io/docs/
3. Check AWS Lambda and API Gateway limits
4. Review application logs for errors
