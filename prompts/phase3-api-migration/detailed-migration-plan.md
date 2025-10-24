# PetStore FaaS-to-IaaS Migration Plan: Detailed Implementation Strategy

## 🎯 **Executive Summary**

This document provides a comprehensive migration plan for transitioning the PetStore application from AWS FaaS (Lambda) architecture to a monolithic NestJS application with PostgreSQL database. Based on analysis of the OpenAPI specification (21 endpoints) and database structure (2 DynamoDB tables), this plan recommends a **unified migration approach** due to the relatively simple database schema and clear relational patterns.

### **Migration Decision: Unified Approach**

**✅ Recommended: Single-Phase Migration to PostgreSQL**

- **Rationale**: Simple 2-table structure with clear relationships makes database migration straightforward
- **Benefits**: Eliminates dual database complexity, simplifies testing, reduces operational overhead
- **Risk Level**: Low - straightforward relational mapping from DynamoDB composite keys

**❌ Not Recommended: Two-Phase Migration (Keep DynamoDB)**

- **Rationale**: Unnecessary complexity for simple schema, doesn't leverage relational database benefits
- **Drawbacks**: Maintains AWS dependencies, complex adapter patterns, dual maintenance burden

## 📊 **Architecture Analysis**

### **Current State: FaaS Architecture**

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React SPA     │────│   API Gateway    │────│ Lambda Functions│
│   (Frontend)    │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                                                         ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   DynamoDB      │    │ AWS Verified    │
                       │   2 Tables      │    │ Permissions     │
                       └─────────────────┘    └─────────────────┘
```

**Current Components:**

- **4 Lambda Functions**: petstoreAdminFranchiseCrud, petstoreAdminStoreCrud, petstoresample78b39c63, petstoreAuthorizer
- **21 API Endpoints**: 6 franchise + 6 store (admin) + 9 store operations (customer-facing)
- **2 DynamoDB Tables**: petstoreFranchise (simple key), petstoreTenants (composite key)
- **Authentication**: API Key (admin) + JWT Bearer (store operations)
- **Authorization**: AWS Verified Permissions with Cedar policies

### **Target State: Monolithic Architecture**

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React SPA     │────│   NestJS App     │────│   PostgreSQL    │
│   (Frontend)    │    │   (Monolith)     │    │   Database      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │ Custom RBAC/ABAC│
                       │ Authorization   │
                       └─────────────────┘
```

**Target Components:**

- **Single NestJS Application**: Modular architecture with 4 main modules
- **PostgreSQL Database**: Relational schema with proper foreign key constraints
- **Hexagonal Architecture**: Ports and Adapters pattern for clean separation
- **Custom Authorization**: Policy-based authorization replacing AWS Verified Permissions

## 🔍 **Detailed Migration Complexity Assessment**

### **Database Migration Complexity: LOW ✅**

**Table Analysis:**

1. **petstoreFranchise → franchises table**

   - Simple structure: id (PK), name, location, stores array
   - **Complexity**: Low - direct mapping to relational structure
   - **Migration Pattern**: Array of stores → One-to-Many relationship

2. **petstoreTenants → stores table**
   - Composite key: (id, value) → Compound primary key or separate unique constraint
   - **Complexity**: Low-Medium - composite key requires careful handling
   - **Migration Pattern**: DynamoDB composite key → PostgreSQL compound key

**Data Relationships:**

- **Franchise-Store**: Clear 1:N relationship, easy to implement with foreign keys
- **No complex NoSQL patterns**: No nested documents, embedded arrays, or denormalized data
- **Authorization entities**: Simple hierarchy (franchise → stores → permissions)

### **API Migration Complexity: MEDIUM 📊**

**Endpoint Categories:**

1. **Admin Franchise Endpoints (6 endpoints) - LOW complexity**

   ```
   GET    /admin/franchise              → FranchiseController.listFranchises()
   POST   /admin/franchise              → FranchiseController.createFranchise()
   PUT    /admin/franchise              → FranchiseController.updateFranchise()
   GET    /admin/franchise/{id}         → FranchiseController.getFranchisesByID()
   GET    /admin/franchise/object/{id}  → FranchiseController.getFranchise()
   DELETE /admin/franchise/object/{id}  → FranchiseController.deleteFranchise()
   ```

   - **Authentication**: API Key only
   - **Business Logic**: Standard CRUD operations
   - **Database Operations**: Simple primary key operations

2. **Admin Store Endpoints (6 endpoints) - MEDIUM complexity**

   ```
   GET    /admin/store                     → StoreController.listStores()
   POST   /admin/store                     → StoreController.createStore()
   PUT    /admin/store                     → StoreController.updateStore()
   GET    /admin/store/{id}                → StoreController.getStoresByID()
   GET    /admin/store/object/{id}/{value} → StoreController.getStore()
   DELETE /admin/store/object/{id}/{value} → StoreController.deleteStore()
   ```

   - **Authentication**: API Key only
   - **Complexity**: Composite key handling for get/delete operations
   - **Database Operations**: Compound key queries and relationships

3. **Store Operations Endpoints (9 endpoints) - HIGH complexity**
   ```
   GET  /store/{storeId}/pets                        → PetController.searchPets()
   POST /store/{storeId}/pet/create                  → PetController.addPet()
   GET  /store/{storeId}/pet/get/{petId}            → PetController.getPet()
   POST /store/{storeId}/pet/update/{petId}         → PetController.updatePet()
   GET  /store/{storeId}/inventory                   → InventoryController.getStoreInventory()
   GET  /store/{storeId}/orders                      → OrderController.listOrders()
   POST /store/{storeId}/order/create                → OrderController.placeOrder()
   GET  /store/{storeId}/order/get/{orderNumber}     → OrderController.getOrder()
   POST /store/{storeId}/order/cancel/{orderNumber}  → OrderController.cancelOrder()
   ```
   - **Authentication**: JWT Bearer tokens
   - **Authorization**: Complex store-level permissions with AWS Verified Permissions
   - **Business Logic**: Pet management, order processing, inventory tracking
   - **User Context**: Store associations, role-based permissions

### **Authorization Migration Complexity: HIGH ⚠️**

**Current System: AWS Verified Permissions**

- **Cedar Policies**: Declarative policy language with entity hierarchy
- **Entity Transformation**: DynamoDB records → Cedar entities with relationships
- **Permission Evaluation**: AWS-managed policy engine with fine-grained access control

**Migration Requirements:**

- **Custom Policy Engine**: Implement Cedar-like policy evaluation in NestJS
- **Entity Mapping**: Transform user context and resources into authorization entities
- **Permission Matrix**: Store-level, franchise-level, and role-based access control
- **Policy Management**: Create, update, and evaluate authorization policies

## 🗓️ **Implementation Timeline: 10-Week Plan**

### **Phase 1: Analysis & Architecture Design (Weeks 1-2)**

#### **Week 1: Deep Architecture Analysis**

**Sprint Goals:**

- Complete technical debt assessment of current Lambda functions
- Analyze all 21 endpoints for business logic complexity
- Design PostgreSQL schema with proper normalization
- Document current authorization flows and policy requirements

**Deliverables:**

- [ ] Technical debt analysis report
- [ ] Complete endpoint business logic documentation
- [ ] PostgreSQL schema design with entity relationships
- [ ] Authorization requirement specification
- [ ] Migration risk assessment matrix

**Tasks:**

```
□ Analyze petstoreAdminFranchiseCrud Lambda function code
□ Analyze petstoreAdminStoreCrud Lambda function code
□ Analyze petstoresample78b39c63 Lambda function code
□ Analyze petstoreAuthorizer Lambda function code
□ Document current DynamoDB query patterns and performance
□ Map AWS Verified Permissions policies to custom authorization
□ Design PostgreSQL schema with proper indexing strategy
□ Create entity relationship diagrams
□ Document API authentication flows
□ Assess third-party integration requirements
```

#### **Week 2: NestJS Architecture Design**

**Sprint Goals:**

- Design modular NestJS architecture using Hexagonal pattern
- Plan authentication and authorization strategy
- Design database abstraction layer with repository pattern
- Create development environment setup

**Deliverables:**

- [ ] NestJS application architecture diagram
- [ ] Module dependency graph
- [ ] Authentication/authorization flow diagrams
- [ ] Database abstraction layer design
- [ ] Development environment configuration

**Project Structure:**

```
src/
├── main.ts                          # Application bootstrap
├── app.module.ts                    # Root application module
│
├── core/                           # Core application infrastructure
│   ├── auth/                       # Authentication & Authorization
│   │   ├── guards/                 # Route guards (API key, JWT, permissions)
│   │   ├── strategies/             # Passport authentication strategies
│   │   ├── decorators/             # Custom authorization decorators
│   │   ├── services/               # Authorization policy engine
│   │   └── types/                  # Auth interfaces and types
│   │
│   ├── database/                   # Database configuration
│   │   ├── config/                 # Database connection configuration
│   │   ├── migrations/             # Database migration files
│   │   └── seeds/                  # Database seed data
│   │
│   └── common/                     # Shared utilities
│       ├── interceptors/           # Request/response interceptors
│       ├── filters/                # Exception filters
│       ├── pipes/                  # Validation pipes
│       └── decorators/             # Common decorators
│
├── modules/                        # Business logic modules
│   ├── franchise/                  # Franchise management (6 endpoints)
│   │   ├── controllers/            # HTTP route handlers
│   │   ├── services/               # Business logic layer
│   │   ├── repositories/           # Data access layer (ports)
│   │   ├── entities/               # Database entities
│   │   ├── dto/                    # Data transfer objects
│   │   └── franchise.module.ts     # Module configuration
│   │
│   ├── store/                      # Store management (6 endpoints)
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── entities/
│   │   ├── dto/
│   │   └── store.module.ts
│   │
│   ├── pet/                        # Pet management (4 endpoints)
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── entities/
│   │   ├── dto/
│   │   └── pet.module.ts
│   │
│   ├── order/                      # Order management (4 endpoints)
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── entities/
│   │   ├── dto/
│   │   └── order.module.ts
│   │
│   └── inventory/                  # Inventory management (1 endpoint)
│       ├── controllers/
│       ├── services/
│       ├── repositories/
│       ├── entities/
│       ├── dto/
│       └── inventory.module.ts
│
└── infrastructure/                 # External service adapters
    ├── repositories/               # Database repository implementations
    ├── external/                   # Third-party service integrations
    └── config/                     # Application configuration
```

### **Phase 2: Foundation & Core Setup (Weeks 3-4)**

#### **Week 3: Project Setup & Database Layer**

**Sprint Goals:**

- Initialize NestJS project with all dependencies
- Implement PostgreSQL database layer with TypeORM
- Create database entities and migration scripts
- Set up development and testing environments

**Deliverables:**

- [ ] Working NestJS application skeleton
- [ ] PostgreSQL database with complete schema
- [ ] TypeORM entities with relationships
- [ ] Database migration and seed scripts
- [ ] Docker development environment

**Database Schema Implementation:**

```sql
-- Franchises table (from petstoreFranchise DynamoDB table)
CREATE TABLE franchises (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Stores table (from petstoreTenants DynamoDB table)
CREATE TABLE stores (
    id VARCHAR(255),
    value VARCHAR(255),
    name VARCHAR(255),
    address TEXT,
    franchise_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id, value),
    FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE CASCADE
);

-- Pets table (new table for pet management)
CREATE TABLE pets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    species VARCHAR(100) NOT NULL,
    breed VARCHAR(100),
    age INTEGER CHECK (age >= 0),
    price DECIMAL(10,2) CHECK (price >= 0),
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'pending', 'sold')),
    store_id VARCHAR(255),
    store_value VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (store_id, store_value) REFERENCES stores(id, value) ON DELETE CASCADE
);

-- Orders table (new table for order management)
CREATE TABLE orders (
    order_number VARCHAR(255) PRIMARY KEY,
    pet_id UUID,
    customer_id VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    total_amount DECIMAL(10,2) CHECK (total_amount >= 0),
    status VARCHAR(20) DEFAULT 'placed' CHECK (status IN ('placed', 'approved', 'delivered', 'cancelled')),
    store_id VARCHAR(255),
    store_value VARCHAR(255),
    order_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE SET NULL,
    FOREIGN KEY (store_id, store_value) REFERENCES stores(id, value) ON DELETE CASCADE
);

-- Inventory table (for inventory tracking)
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id VARCHAR(255),
    store_value VARCHAR(255),
    pet_id UUID,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    reserved_quantity INTEGER NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (store_id, store_value) REFERENCES stores(id, value) ON DELETE CASCADE,
    FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE,
    UNIQUE(store_id, store_value, pet_id)
);

-- Create indexes for performance
CREATE INDEX idx_stores_franchise_id ON stores(franchise_id);
CREATE INDEX idx_pets_store ON pets(store_id, store_value);
CREATE INDEX idx_pets_status ON pets(status);
CREATE INDEX idx_orders_store ON orders(store_id, store_value);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_inventory_store ON inventory(store_id, store_value);
```

#### **Week 4: Authentication & Authorization System**

**Sprint Goals:**

- Implement API Key authentication for admin endpoints
- Implement JWT authentication for store endpoints
- Create custom authorization service replacing AWS Verified Permissions
- Implement policy-based access control

**Deliverables:**

- [ ] API Key authentication guard
- [ ] JWT authentication strategy with Passport.js
- [ ] Custom authorization service with policy engine
- [ ] Permission decorators and guards
- [ ] User context management

**Authentication Implementation:**

```typescript
// API Key Guard for Admin Endpoints
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers["x-api-key"];
    const validApiKey = this.configService.get<string>("API_KEY");

    if (!apiKey || apiKey !== validApiKey) {
      throw new UnauthorizedException("Invalid API key");
    }

    return true;
  }
}

// JWT Strategy for Store Endpoints
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("JWT_SECRET"),
    });
  }

  async validate(payload: any) {
    return {
      userId: payload.sub,
      username: payload.username,
      storeAccess: payload.storeAccess, // Array of accessible stores
      roles: payload.roles,
    };
  }
}

// Custom Authorization Service
@Injectable()
export class AuthorizationService {
  async checkPermission(
    user: UserContext,
    action: string,
    resource: any
  ): Promise<AuthorizationResult> {
    const policies = await this.loadPolicies();
    const context = this.buildAuthorizationContext(user, action, resource);

    return this.evaluatePolicies(policies, context);
  }

  private buildAuthorizationContext(
    user: UserContext,
    action: string,
    resource: any
  ) {
    return {
      principal: {
        entityType: "User",
        entityId: user.userId,
        attributes: {
          roles: user.roles,
          storeAccess: user.storeAccess,
        },
      },
      action: {
        actionType: action,
      },
      resource: {
        entityType: this.getResourceType(resource),
        entityId: resource.id || resource.storeId,
        attributes: resource,
      },
    };
  }

  private async evaluatePolicies(
    policies: Policy[],
    context: AuthorizationContext
  ): Promise<AuthorizationResult> {
    // Implement Cedar-like policy evaluation logic
    for (const policy of policies) {
      if (this.matchesPolicy(policy, context)) {
        return {
          decision: policy.effect === "permit" ? "ALLOW" : "DENY",
          determiningPolicies: [policy.id],
          message:
            policy.effect === "permit"
              ? `Access granted by policy ${policy.id}`
              : `Access denied by policy ${policy.id}`,
        };
      }
    }

    return {
      decision: "DENY",
      determiningPolicies: [],
      message: "No matching policy found - default deny",
    };
  }
}
```

### **Phase 3: Module Migration (Weeks 5-7)**

#### **Week 5: Franchise and Store Modules (Admin Endpoints)**

**Sprint Goals:**

- Implement complete Franchise module (6 endpoints)
- Implement complete Store module (6 endpoints)
- Handle composite key operations for stores
- Implement admin API key authentication

**Deliverables:**

- [ ] Franchise module with all CRUD operations
- [ ] Store module with composite key handling
- [ ] Admin controllers with API key authentication
- [ ] Service layer with business logic
- [ ] Repository pattern implementation

**Franchise Module Implementation:**

```typescript
@Controller("admin/franchise")
@UseGuards(ApiKeyGuard)
@ApiTags("Admin - Franchises")
export class FranchiseController {
  constructor(private readonly franchiseService: FranchiseService) {}

  @Get()
  @ApiOperation({ summary: "List all franchises" })
  async listFranchises(): Promise<Franchise[]> {
    return this.franchiseService.findAll();
  }

  @Post()
  @ApiOperation({ summary: "Create a new franchise" })
  async createFranchise(
    @Body() createFranchiseDto: CreateFranchiseDto
  ): Promise<SuccessResponse> {
    await this.franchiseService.create(createFranchiseDto);
    return {
      success: "post call succeed!",
      url: "/admin/franchise",
      data: {},
    };
  }

  @Put()
  @ApiOperation({ summary: "Update a franchise" })
  async updateFranchise(
    @Body() updateFranchiseDto: UpdateFranchiseDto
  ): Promise<SuccessResponse> {
    await this.franchiseService.update(
      updateFranchiseDto.id,
      updateFranchiseDto
    );
    return {
      success: "put call succeed!",
      url: "/admin/franchise",
      data: {},
    };
  }

  @Get(":id")
  @ApiOperation({ summary: "Get franchises by ID" })
  async getFranchisesByID(@Param("id") id: string): Promise<Franchise[]> {
    // DynamoDB query behavior - returns array even for single partition key
    const franchise = await this.franchiseService.findById(id);
    return franchise ? [franchise] : [];
  }

  @Get("object/:id")
  @ApiOperation({ summary: "Get a specific franchise" })
  async getFranchise(@Param("id") id: string): Promise<Franchise> {
    const franchise = await this.franchiseService.findById(id);
    if (!franchise) {
      throw new NotFoundException("Franchise not found");
    }
    return franchise;
  }

  @Delete("object/:id")
  @ApiOperation({ summary: "Delete a franchise" })
  async deleteFranchise(@Param("id") id: string): Promise<DeleteResponse> {
    await this.franchiseService.remove(id);
    return {
      url: `/admin/franchise/object/${id}`,
      data: {},
    };
  }
}
```

**Store Module with Composite Key Handling:**

```typescript
@Controller("admin/store")
@UseGuards(ApiKeyGuard)
@ApiTags("Admin - Stores")
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @Get("object/:id/:value")
  @ApiOperation({ summary: "Get a specific store" })
  async getStore(
    @Param("id") id: string,
    @Param("value") value: string
  ): Promise<Store> {
    const store = await this.storeService.findByCompositeKey(id, value);
    if (!store) {
      throw new NotFoundException("Store not found");
    }
    return store;
  }

  @Delete("object/:id/:value")
  @ApiOperation({ summary: "Delete a store" })
  async deleteStore(
    @Param("id") id: string,
    @Param("value") value: string
  ): Promise<DeleteResponse> {
    await this.storeService.removeByCompositeKey(id, value);
    return {
      url: `/admin/store/object/${id}/${value}`,
      data: {},
    };
  }
}

// Store Service with Composite Key Operations
@Injectable()
export class StoreService {
  constructor(
    @InjectRepository(Store)
    private storeRepository: Repository<Store>
  ) {}

  async findByCompositeKey(id: string, value: string): Promise<Store | null> {
    return this.storeRepository.findOne({
      where: { id, value },
      relations: ["franchise"],
    });
  }

  async removeByCompositeKey(id: string, value: string): Promise<void> {
    const result = await this.storeRepository.delete({ id, value });
    if (result.affected === 0) {
      throw new NotFoundException("Store not found");
    }
  }
}
```

#### **Week 6: Pet Module (Store Endpoints with Authorization)**

**Sprint Goals:**

- Implement Pet module (4 endpoints) with authorization
- Integrate custom authorization service
- Handle store-level permissions
- Implement JWT authentication guards

**Deliverables:**

- [ ] Pet module with authorization checks
- [ ] Pet controller with JWT authentication
- [ ] Service layer with permission validation
- [ ] Authorization integration for store access

**Pet Module with Authorization:**

```typescript
@Controller("store/:storeId/pet")
@UseGuards(JwtAuthGuard)
@ApiTags("Store - Pets")
export class PetController {
  constructor(
    private readonly petService: PetService,
    private readonly authorizationService: AuthorizationService
  ) {}

  @Post("create")
  @ApiOperation({ summary: "Add a new pet" })
  async addPet(
    @Param("storeId") storeId: string,
    @Body() createPetDto: CreatePetDto,
    @Request() req: any
  ): Promise<AuthorizedResponse> {
    const authResult = await this.authorizationService.checkPermission(
      req.user,
      "AddPet",
      { storeId }
    );

    if (authResult.decision === "DENY") {
      throw new ForbiddenException({
        decision: "DENY",
        message: authResult.message,
        statusCode: 403,
      });
    }

    await this.petService.create(storeId, createPetDto);

    return {
      decision: "ALLOW",
      message: `Successful backend response for POST /store/${storeId}/pet/create`,
      statusCode: 200,
    };
  }

  @Get("get/:petId")
  @ApiOperation({ summary: "Get pet details" })
  async getPet(
    @Param("storeId") storeId: string,
    @Param("petId") petId: string,
    @Request() req: any
  ): Promise<AuthorizedResponse> {
    // Note: Authorization is not mapped for this endpoint in current implementation
    // but we still validate store access
    const authResult = await this.authorizationService.checkPermission(
      req.user,
      "ViewPet",
      { storeId, petId }
    );

    if (authResult.decision === "DENY") {
      throw new ForbiddenException({
        decision: "DENY",
        message: authResult.message,
        statusCode: 403,
      });
    }

    return {
      decision: "ALLOW",
      message: `Successful backend response for GET /store/${storeId}/pet/get/${petId}`,
      statusCode: 200,
    };
  }
}
```

#### **Week 7: Order and Inventory Modules**

**Sprint Goals:**

- Implement Order module (4 endpoints) with complex authorization
- Implement Inventory module (1 endpoint)
- Complete authorization integration
- Implement business logic for order management

**Deliverables:**

- [ ] Order module with full CRUD operations
- [ ] Inventory module with store-level access
- [ ] Complex authorization for order ownership
- [ ] Order status management and business rules

### **Phase 4: Data Migration & Integration (Week 8)**

#### **Week 8: Data Migration and System Integration**

**Sprint Goals:**

- Create data migration scripts from DynamoDB to PostgreSQL
- Implement data validation and integrity checks
- Set up connection pooling and database optimization
- Complete end-to-end integration testing

**Deliverables:**

- [ ] DynamoDB to PostgreSQL migration scripts
- [ ] Data validation and integrity checks
- [ ] Database connection pooling configuration
- [ ] Performance optimization (indexing, query optimization)
- [ ] Integration test suite

**Data Migration Strategy:**

```typescript
// Migration Service
@Injectable()
export class DataMigrationService {
  constructor(
    private dynamodbService: DynamoDBService,
    private postgresService: PostgresService
  ) {}

  async migrateFranchises(): Promise<void> {
    console.log("Starting franchise migration...");

    const franchises = await this.dynamodbService.scanTable(
      "petstoreFranchise"
    );

    for (const franchise of franchises) {
      try {
        await this.postgresService.upsertFranchise({
          id: franchise.id,
          name: franchise.name,
          location: franchise.location || null,
          createdAt: franchise.createdAt || new Date(),
          updatedAt: franchise.updatedAt || new Date(),
        });

        console.log(`Migrated franchise: ${franchise.id}`);
      } catch (error) {
        console.error(`Failed to migrate franchise ${franchise.id}:`, error);
        throw error;
      }
    }
  }

  async migrateStores(): Promise<void> {
    console.log("Starting store migration...");

    const stores = await this.dynamodbService.scanTable("petstoreTenants");

    for (const store of stores) {
      try {
        await this.postgresService.upsertStore({
          id: store.id,
          value: store.value,
          name: store.name,
          address: store.address || null,
          franchiseId: store.franchise?.id || null,
          createdAt: store.createdAt || new Date(),
          updatedAt: store.updatedAt || new Date(),
        });

        console.log(`Migrated store: ${store.id}/${store.value}`);
      } catch (error) {
        console.error(
          `Failed to migrate store ${store.id}/${store.value}:`,
          error
        );
        throw error;
      }
    }
  }

  async validateMigration(): Promise<ValidationReport> {
    const report = new ValidationReport();

    // Validate franchise migration
    const dynamoFranchiseCount = await this.dynamodbService.getTableCount(
      "petstoreFranchise"
    );
    const postgresFranchiseCount =
      await this.postgresService.getFranchiseCount();

    report.addCheck(
      "franchise_count",
      dynamoFranchiseCount === postgresFranchiseCount
    );

    // Validate store migration
    const dynamoStoreCount = await this.dynamodbService.getTableCount(
      "petstoreTenants"
    );
    const postgresStoreCount = await this.postgresService.getStoreCount();

    report.addCheck("store_count", dynamoStoreCount === postgresStoreCount);

    // Validate relationships
    const orphanedStores = await this.postgresService.findOrphanedStores();
    report.addCheck("store_relationships", orphanedStores.length === 0);

    return report;
  }
}
```

### **Phase 5: Testing & Quality Assurance (Week 9)**

#### **Week 9: Comprehensive Testing**

**Sprint Goals:**

- Implement unit tests for all modules
- Create integration tests for API endpoints
- Implement end-to-end authorization testing
- Performance testing and optimization

**Deliverables:**

- [ ] Unit test suite (>90% coverage)
- [ ] Integration test suite for all 21 endpoints
- [ ] Authorization and authentication tests
- [ ] Performance benchmarks and optimization
- [ ] Security testing and vulnerability assessment

**Testing Implementation:**

```typescript
// Integration Test Example
describe("FranchiseController (Integration)", () => {
  let app: INestApplication;
  let franchiseRepository: Repository<Franchise>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    franchiseRepository = moduleFixture.get("FranchiseRepository");
    await app.init();
  });

  describe("POST /admin/franchise", () => {
    it("should create franchise with valid API key", async () => {
      const createFranchiseDto = {
        id: "test-franchise-001",
        name: "Test Franchise",
        location: "Test Location",
      };

      const response = await request(app.getHttpServer())
        .post("/admin/franchise")
        .set("x-api-key", process.env.TEST_API_KEY)
        .send(createFranchiseDto)
        .expect(201);

      expect(response.body).toEqual({
        success: "post call succeed!",
        url: "/admin/franchise",
        data: {},
      });

      // Verify franchise was created in database
      const franchise = await franchiseRepository.findOne({
        where: { id: "test-franchise-001" },
      });
      expect(franchise).toBeDefined();
      expect(franchise.name).toBe("Test Franchise");
    });

    it("should reject request without API key", async () => {
      const createFranchiseDto = {
        id: "test-franchise-002",
        name: "Test Franchise 2",
      };

      await request(app.getHttpServer())
        .post("/admin/franchise")
        .send(createFranchiseDto)
        .expect(401);
    });
  });
});

// Authorization Test Example
describe("Authorization Service", () => {
  let service: AuthorizationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthorizationService],
    }).compile();

    service = module.get<AuthorizationService>(AuthorizationService);
  });

  it("should allow store manager to add pets to their store", async () => {
    const user = {
      userId: "manager-001",
      roles: ["store_manager"],
      storeAccess: ["store-001"],
    };

    const result = await service.checkPermission(user, "AddPet", {
      storeId: "store-001",
    });

    expect(result.decision).toBe("ALLOW");
    expect(result.message).toContain("Access granted");
  });

  it("should deny store manager access to different store", async () => {
    const user = {
      userId: "manager-001",
      roles: ["store_manager"],
      storeAccess: ["store-001"],
    };

    const result = await service.checkPermission(user, "AddPet", {
      storeId: "store-002",
    });

    expect(result.decision).toBe("DENY");
    expect(result.message).toContain("Access denied");
  });
});
```

### **Phase 6: Production Deployment (Week 10)**

#### **Week 10: Production Deployment and Optimization**

**Sprint Goals:**

- Production environment setup with Docker
- Database performance optimization and monitoring
- Security hardening and compliance
- Deployment automation and monitoring

**Deliverables:**

- [ ] Production Docker configuration
- [ ] Database performance optimization
- [ ] Security hardening implementation
- [ ] CI/CD pipeline setup
- [ ] Monitoring and logging configuration
- [ ] Documentation and deployment guides

**Production Configuration:**

```yaml
# docker-compose.prod.yml
version: "3.8"
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.prod
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
      - API_KEY=${API_KEY}
    depends_on:
      - postgres
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=${POSTGRES_DB}
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
```

## 🎯 **Migration Success Criteria**

### **Functional Requirements ✅**

- [ ] All 21 API endpoints migrated and functional
- [ ] Authentication working (API Key + JWT)
- [ ] Authorization matching current AWS Verified Permissions behavior
- [ ] Data integrity maintained from DynamoDB to PostgreSQL
- [ ] All business logic preserved and tested

### **Non-Functional Requirements 📊**

- [ ] **Performance**: Response times ≤ current Lambda performance
- [ ] **Scalability**: Support horizontal scaling with load balancer
- [ ] **Security**: Pass security audit, implement OWASP best practices
- [ ] **Reliability**: 99.9% uptime with proper monitoring
- [ ] **Maintainability**: Comprehensive test coverage (>90%)

### **Migration Validation Checklist 📋**

- [ ] **Data Migration**: 100% data integrity validation
- [ ] **Functional Testing**: All endpoints pass integration tests
- [ ] **Authorization Testing**: Permission matrix validated
- [ ] **Performance Testing**: Load testing with expected traffic
- [ ] **Security Testing**: Vulnerability assessment passed
- [ ] **Monitoring**: Health checks, logging, and alerting configured

## ⚠️ **Risk Assessment & Mitigation**

### **High Risk: Authorization Complexity**

**Risk**: Custom authorization service may not match AWS Verified Permissions behavior exactly
**Mitigation**:

- Comprehensive policy testing with current authorization matrix
- Gradual rollout with canary deployment
- Fallback mechanism to AWS Verified Permissions during transition
- Extensive authorization unit and integration tests

**Validation Strategy:**

```typescript
// Authorization Validation Test Suite
describe("Authorization Migration Validation", () => {
  it("should match AWS Verified Permissions decisions", async () => {
    const testCases = await loadAWSAuthorizationTestCases();

    for (const testCase of testCases) {
      const awsResult = testCase.expectedResult;
      const customResult = await authorizationService.checkPermission(
        testCase.user,
        testCase.action,
        testCase.resource
      );

      expect(customResult.decision).toBe(awsResult.decision);
    }
  });
});
```

### **Medium Risk: Database Performance**

**Risk**: Single PostgreSQL database may not match DynamoDB performance characteristics
**Mitigation**:

- Comprehensive indexing strategy
- Connection pooling with pgBouncer
- Query optimization and monitoring
- Read replicas for read-heavy operations
- Database performance benchmarking

### **Medium Risk: Single Point of Failure**

**Risk**: Monolithic application creates single point of failure vs distributed Lambda
**Mitigation**:

- Horizontal scaling with multiple application instances
- Load balancer with health checks
- Comprehensive monitoring and alerting
- Automated failover and recovery procedures
- Circuit breaker pattern for external dependencies

### **Low Risk: Data Migration**

**Risk**: Data loss or corruption during DynamoDB to PostgreSQL migration
**Mitigation**:

- Comprehensive data validation scripts
- Incremental migration with rollback capability
- Full data backup before migration
- Data integrity verification at each step
- Parallel running of both systems during validation

## 💰 **Cost-Benefit Analysis**

### **Migration Costs 💸**

- **Development Time**: 10 weeks × 1 senior developer = ~$50,000-70,000
- **Infrastructure Setup**: PostgreSQL hosting, monitoring tools = ~$500-1,000/month
- **Testing & QA**: Additional 2 weeks for comprehensive testing = ~$10,000-15,000
- **Total Migration Cost**: ~$60,000-85,000

### **Operational Benefits 💰**

- **AWS Lambda Cost Reduction**: ~$200-500/month (depends on usage)
- **Simplified Monitoring**: Reduced complexity = ~$100-200/month savings
- **Development Velocity**: Faster feature development = ~20% productivity gain
- **Maintenance Reduction**: Single codebase vs 4 Lambda functions = ~30% reduction

### **ROI Calculation 📊**

- **Break-even Point**: ~12-18 months depending on usage patterns
- **Long-term Savings**: ~$3,000-6,000/year in operational costs
- **Development Productivity**: ~20% faster feature development
- **Technical Debt Reduction**: Simplified architecture maintenance

## 📚 **Documentation & Knowledge Transfer**

### **Technical Documentation 📖**

- [ ] **Architecture Documentation**: Complete system design and patterns
- [ ] **API Documentation**: Updated OpenAPI specification
- [ ] **Database Schema**: Entity relationships and migration guides
- [ ] **Authorization Documentation**: Policy engine and permission matrix
- [ ] **Deployment Guide**: Production setup and configuration

### **Operational Documentation 🔧**

- [ ] **Monitoring Playbook**: Alerts, dashboards, and troubleshooting
- [ ] **Incident Response**: Common issues and resolution procedures
- [ ] **Backup & Recovery**: Database backup and disaster recovery procedures
- [ ] **Security Guidelines**: Authentication, authorization, and compliance
- [ ] **Performance Tuning**: Optimization strategies and benchmarks

### **Developer Documentation 👨‍💻**

- [ ] **Development Setup**: Local environment configuration
- [ ] **Coding Standards**: Style guides and best practices
- [ ] **Testing Guidelines**: Unit, integration, and E2E testing strategies
- [ ] **Contribution Guide**: Code review process and development workflow
- [ ] **Troubleshooting Guide**: Common development issues and solutions

## 🚀 **Conclusion**

This migration plan provides a comprehensive roadmap for transitioning the PetStore application from AWS FaaS architecture to a monolithic NestJS application with PostgreSQL database. The **unified migration approach** is recommended due to the relatively simple database structure (2 tables with clear relationships) and straightforward endpoint patterns.

### **Key Success Factors:**

1. **Comprehensive Authorization Testing**: Critical to ensure custom authorization matches AWS Verified Permissions
2. **Phased Implementation**: Gradual module migration reduces risk and allows for iterative validation
3. **Data Integrity Focus**: Thorough migration validation and testing prevents data loss
4. **Performance Optimization**: Proper indexing and connection pooling ensure production readiness

### **Expected Timeline:**

- **10 weeks total implementation time**
- **Production deployment in Week 10**
- **Break-even point in 12-18 months**
- **Long-term operational cost savings of $3,000-6,000/year**

The migration will result in a more maintainable, testable, and operationally efficient system while preserving all existing functionality and business logic. 🎯
