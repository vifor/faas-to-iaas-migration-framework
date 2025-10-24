# PetStore Monolithic Application

A NestJS-based monolithic application for migrating from AWS Lambda functions to a containerized architecture, maintaining compatibility with existing DynamoDB tables.

## 🏗️ Architecture

This application follows hexagonal architecture principles to ensure clean separation of concerns and testability:

```
src/
├── main.ts                 # Application entry point
├── app.module.ts           # Root application module
├── config/                 # Configuration management
│   ├── app.config.ts
│   ├── aws.config.ts
│   └── database.config.ts
├── modules/                # Feature modules
├── adapters/               # External service adapters
├── services/               # Business logic services
├── controllers/            # HTTP request handlers
└── interfaces/             # Type definitions
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- AWS CLI configured (for production)

### Development Setup

1. **Clone and navigate to the project:**
   ```bash
   cd src/monolith-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment:**
   ```bash
   cp .env.example .env.development
   # Edit .env.development with your configuration
   ```

4. **Start with Docker (recommended):**
   ```bash
   docker-compose up -d
   ```

5. **Or start locally:**
   ```bash
   npm run start:dev
   ```

### Available Scripts

- `npm run start` - Start production server
- `npm run start:dev` - Start development server with hot reload
- `npm run start:debug` - Start in debug mode
- `npm run build` - Build for production
- `npm run test` - Run unit tests
- `npm run test:e2e` - Run end-to-end tests
- `npm run test:cov` - Run tests with coverage
- `npm run lint` - Lint code
- `npm run format` - Format code

## 🐳 Docker Development

The application includes a complete Docker setup for development:

- **NestJS App**: Main application with hot reload
- **DynamoDB Local**: Local DynamoDB instance
- **DynamoDB Admin**: Web UI for database management

Access points:
- Application: http://localhost:3000
- DynamoDB Admin: http://localhost:8001
- Health Check: http://localhost:3000/health

## 🗄️ Database

This application is designed to work with existing DynamoDB tables from the Lambda functions:

- `petstoreFranchise` - Franchise management data
- `petstoreTenants` - Tenant information

The application maintains backward compatibility with existing data structures while providing a foundation for future schema evolution.

## 🔧 Configuration

The application uses environment-based configuration with the following files:

- `.env.development` - Development environment
- `.env.staging` - Staging environment  
- `.env.production` - Production environment

See `.env.example` for all available configuration options.

## 🏥 Health Monitoring

Built-in health checks are available at `/health` endpoint, monitoring:

- Application status
- DynamoDB connectivity
- Memory usage
- Disk space (in production)

## 🔐 Security

The application includes security best practices:

- Helmet for security headers
- CORS configuration
- Input validation with class-validator
- Rate limiting (configurable)
- JWT authentication ready

## 📊 Migration Status

This is **Task 1** of the 12-task migration plan from AWS Lambda to monolithic architecture:

✅ **Task 1**: NestJS project setup with TypeScript configuration  
⏳ **Task 2**: DynamoDB connection service  
⏳ **Task 3**: Data models and repositories  
⏳ **Task 4**: Authentication module  
⏳ **Task 5**: Franchise management module  
⏳ **Task 6**: Store management module  
⏳ **Task 7**: API integration layer  
⏳ **Task 8**: Request validation and middleware  
⏳ **Task 9**: Error handling and logging  
⏳ **Task 10**: Testing setup  
⏳ **Task 11**: Performance optimization  
⏳ **Task 12**: Deployment configuration  

## 🤝 Contributing

This application is part of a thesis research project on FaaS to IaaS migration. The codebase follows the migration framework criteria for maintainable, scalable architecture.

## 📝 License

This project is part of academic research. See LICENSE file for details.