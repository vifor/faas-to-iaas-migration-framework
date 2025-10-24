# Universal FaaS Application K6 Load Testing Suite Generation Prompt

## Context

You are an expert performance testing engineer tasked with creating a comprehensive K6 load testing suite for a FaaS (Function-as-a-Service) application. The goal is to generate a complete, production-ready testing framework that can validate performance, scalability, and reliability under various load conditions.

## Task Requirements

### Primary Objective

Create a comprehensive K6 load testing suite for the FaaS application that includes:

1. **Complete Test Coverage**

   - All API endpoints from OpenAPI specification or API documentation
   - Multiple test types (smoke, load, stress, spike tests)
   - Authentication and authorization flows
   - Error scenarios and edge cases
   - Business workflow simulations

2. **Authentication & Security Testing**

   - Support for all authentication methods used by the FaaS app (API keys, JWT tokens, OAuth, etc.)
   - Authorization testing with proper user roles and permissions
   - Security error scenarios (missing credentials, expired tokens, unauthorized access)
   - Cross-resource access validation

3. **Performance Monitoring**

   - Custom metrics for business operations
   - AWS/Cloud provider specific monitoring (Lambda cold starts, API Gateway latency)
   - Response time tracking by endpoint and operation type
   - Success/failure rate monitoring
   - Concurrent user level tracking

4. **Test Data Management**
   - Dynamic test data generation for realistic testing
   - Business rule compliance in test data
   - Multiple user profiles and scenarios
   - Configurable data volumes for different test types

### Implementation Requirements

#### Project Structure

```
scripts/load-testing/
├── package.json                 # Dependencies and scripts
├── README.md                   # Comprehensive documentation
├── .gitignore                  # Ignore patterns for secrets and results
├── {test-type}.json            # Configuration files for each test type
├── {test-name}.js              # Main test files for different scenarios
├── config/                     # Configuration modules
│   ├── environment.example.js  # Environment template
│   ├── environment.js          # Actual environment config
│   ├── auth.js                 # Authentication utilities
│   └── test-data.js            # Test data generators
├── utils/                      # Utility modules
│   ├── validation.js           # Response validation helpers
│   └── metrics.js              # Custom metrics collection
└── test-scenarios/             # Test scenario modules
    └── {feature}-operations.js # Feature-specific operations
```

#### Test Types to Implement

1. **Smoke Test** - Basic functionality validation (30s, 1-2 VUs)
2. **Load Test** - Normal expected load (5-10 minutes, 10-50 VUs)
3. **Stress Test** - Beyond normal capacity (10-15 minutes, 50-100+ VUs)
4. **Spike Test** - Sudden traffic spikes (3-5 minutes, rapid ramp to high VUs)

#### Specialized Test Files

1. **Main Test Suite** - Complete business workflow testing
2. **Authentication Flow Test** - Dedicated auth/authz testing
3. **Feature-Specific Tests** - Individual feature deep-dive testing
4. **Mixed Workload Test** - Realistic user distribution simulation
5. **Error Scenario Test** - Comprehensive error handling validation

### Technical Specifications

#### Authentication Support

- Analyze the FaaS application's authentication methods
- Implement token caching and refresh mechanisms
- Support multiple user profiles and roles
- Handle authentication failures gracefully

#### Metrics and Monitoring

```javascript
// Custom Metrics Categories
- {feature}_operation_duration    # Feature-specific timing
- {feature}_success_rate         # Feature success rates
- auth_operation_duration        # Authentication timing
- business_transaction_counters  # Business operation counts
- error_counters_by_type        # Error categorization
- cloud_provider_specific_metrics # AWS Lambda, Azure Functions, etc.
```

#### Validation Framework

- HTTP status code validation
- Response schema validation
- Business logic validation
- Performance threshold validation
- Security validation (proper auth responses)

#### Configuration Management

- Environment-specific configurations (dev/staging/prod)
- Externalized secrets and credentials
- Configurable test parameters
- Override mechanisms for different environments

### Documentation Requirements

#### README.md Must Include

1. **Prerequisites** - K6 installation instructions for all platforms
2. **Quick Start** - Step-by-step setup and execution
3. **Configuration** - Environment setup and customization
4. **Test Types** - Description of each test type and when to use
5. **Usage Examples** - Command examples for different scenarios
6. **CI/CD Integration** - GitHub Actions or similar examples
7. **Troubleshooting** - Common issues and solutions
8. **Metrics Guide** - Understanding the custom metrics

#### Code Documentation

- Inline comments explaining complex logic
- Function and class documentation
- Configuration option explanations
- Example usage in comments

### Deliverables Checklist

#### Core Files

- [ ] package.json with all necessary scripts and dependencies
- [ ] Complete README.md with setup and usage instructions
- [ ] Environment configuration template and example
- [ ] .gitignore for secrets and temporary files

#### Test Configurations

- [ ] smoke-test.json - Basic validation configuration
- [ ] load-test.json - Normal load test configuration
- [ ] stress-test.json - High load test configuration
- [ ] spike-test.json - Traffic spike test configuration

#### Test Files

- [ ] test-suite.js - Comprehensive main test
- [ ] auth-flow.js - Authentication testing
- [ ] {feature}-endpoints.js - Feature-specific tests
- [ ] mixed-workload.js - Realistic usage patterns
- [ ] error-scenarios.js - Error handling validation

#### Utility Modules

- [ ] config/auth.js - Authentication utilities
- [ ] config/test-data.js - Test data generators
- [ ] utils/validation.js - Response validation helpers
- [ ] utils/metrics.js - Custom metrics collection
- [ ] test-scenarios/{feature}-operations.js - Feature operations

#### Quality Assurance

- [ ] All API endpoints covered in tests
- [ ] All authentication methods supported
- [ ] Error scenarios comprehensively tested
- [ ] Performance thresholds defined
- [ ] Business workflows validated

#### Documentation and Reporting

- [ ] TASK_COMPLETION_REPORT.md - Comprehensive implementation report
- [ ] Implementation summary with all deliverables
- [ ] Technical specifications documentation
- [ ] Quality assurance validation results
- [ ] Business value and operational benefits summary

### Application Analysis Requirements

Before implementation, analyze the FaaS application for:

1. **API Documentation**

   - OpenAPI/Swagger specification
   - Available endpoints and methods
   - Request/response schemas
   - Authentication requirements

2. **Authentication Architecture**

   - Authentication methods (API keys, JWT, OAuth, etc.)
   - Authorization mechanisms
   - User roles and permissions
   - Token expiration and refresh

3. **Business Operations**

   - Core business workflows
   - CRUD operations
   - Complex business processes
   - User interaction patterns

4. **Cloud Provider Specifics**

   - AWS Lambda, Azure Functions, Google Cloud Functions
   - API Gateway configuration
   - Cold start characteristics
   - Throttling and rate limiting

5. **Performance Requirements**
   - Expected response times
   - Concurrent user expectations
   - Error rate tolerances
   - Scalability requirements

### Success Criteria

The completed K6 load testing suite should:

1. **Functional Completeness**

   - Cover 100% of API endpoints
   - Support all authentication methods
   - Include comprehensive error scenarios
   - Validate all business workflows

2. **Performance Validation**

   - Establish performance baselines
   - Detect performance regressions
   - Validate scalability requirements
   - Monitor cloud-specific metrics

3. **Operational Readiness**

   - Ready for CI/CD integration
   - Environment-specific configurations
   - Comprehensive monitoring and alerting
   - Clear documentation and troubleshooting

4. **Maintainability**
   - Modular and extensible architecture
   - Clear separation of concerns
   - Reusable components
   - Easy configuration management

## Execution Instructions

1. **Analyze the FaaS Application**

   - Review API documentation or OpenAPI specification
   - Identify authentication methods and requirements
   - Understand business workflows and operations
   - Note cloud provider specific characteristics

2. **Create Project Structure**

   - Set up the directory structure as specified
   - Create package.json with necessary dependencies
   - Implement configuration management system

3. **Implement Authentication**

   - Create authentication utilities for all auth methods
   - Implement token caching and refresh mechanisms
   - Add error handling for authentication failures

4. **Develop Test Scenarios**

   - Create operation modules for each feature area
   - Implement test data generators
   - Build comprehensive validation framework

5. **Create Test Files**

   - Implement all specified test types
   - Create specialized test files for different scenarios
   - Add custom metrics and monitoring

6. **Documentation and Quality**

   - Write comprehensive README with examples
   - Add inline documentation
   - Ensure all requirements are met

7. **Generate Task Completion Report**
   - Create a comprehensive TASK_COMPLETION_REPORT.md documenting the implementation
   - Include all deliverables, features implemented, and usage instructions
   - Provide implementation summary and quality assurance details
   - Document technical specifications and business value delivered

## Example Command

```bash
# After implementation, users should be able to run:
npm run test:smoke      # Quick validation
npm run test:load       # Normal load test
npm run test:stress     # Stress test
npm run test:mixed      # Realistic workload
```

This prompt should generate a complete, production-ready K6 load testing suite that can be immediately used to validate the performance and reliability of any FaaS application.

## Final Deliverable Requirement

**MANDATORY:** After completing the implementation, generate a comprehensive `TASK_COMPLETION_REPORT.md` that includes:

### Report Structure

1. **Task Overview** - Objectives achieved and implementation status
2. **Implementation Summary** - Complete project structure and deliverables
3. **Technical Details** - Authentication methods, test types, and features implemented
4. **Usage Instructions** - Quick start commands and configuration guidance
5. **Quality Assurance** - Test coverage, validation completeness, and performance benchmarks
6. **Business Value** - Operational benefits and development advantages
7. **Production Readiness** - Deployment checklist and next steps

### Report Content Requirements

- **Complete Deliverables List** - All files created with descriptions
- **Feature Coverage Matrix** - Authentication, test types, monitoring, validation
- **Performance Specifications** - Thresholds, targets, and success criteria
- **Configuration Examples** - Environment setup and customization
- **Implementation Quality** - Code documentation, error handling, modularity
- **Operational Benefits** - Performance validation, scalability testing, CI/CD integration

The report should serve as both implementation documentation and a guide for future maintenance and enhancements of the K6 load testing suite.
