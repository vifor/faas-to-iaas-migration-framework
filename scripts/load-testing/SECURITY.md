# Security Configuration

## Environment Variables for FaaS vs IaaS Tests

The comparison tests use environment variables to protect sensitive information:

### Setup Instructions

1. Copy the example file:

   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your actual credentials:
   - `FAAS_*` variables: Your AWS Cognito and API Gateway configuration
   - `IAAS_*` variables: Your local NestJS application credentials

### Security Features

- **Credentials Protection**: No hardcoded passwords or API keys in source code
- **Gitignore Protection**: `.env` file is automatically ignored by git
- **Validation**: Tests validate required variables are set before running
- **Fallback Values**: Non-sensitive defaults provided for URLs and performance expectations

### Required Variables

- `FAAS_CLIENT_ID`: AWS Cognito Client ID
- `FAAS_USERNAME`: Cognito user for authentication
- `FAAS_PASSWORD`: Cognito user password
- `IAAS_EMAIL`: NestJS application email
- `IAAS_PASSWORD`: NestJS application password

### Optional Variables

All URL and performance expectation variables have sensible defaults but can be overridden via environment variables.
