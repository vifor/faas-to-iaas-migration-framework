# FaaS-to-IaaS Migration Framework

This diagram shows the decision flow for migrating FaaS applications to monolithic IaaS architecture.

## Framework Diagram

```mermaid
flowchart TD
    A[Start: FaaS Migration] --> B(Step 1: Analyze Backend via Prompt → openapi.yaml)
    B --> C(Step 2: Analyze Data Layer via Prompt/IaC → data-base-definition.txt)
    C --> D{Is 2-stage migration viable?}

    %% Unified Path - Defines DB steps
    D -->|"No (Many DBs, High Duplication)"| L[Design Relational DB Schema]
    L --> M[Implement NestJS Hexagonal Backend Logic<br>with Relational DB Adapter SQL]
    M --> N[Migrate Data]

    %% 2-Stage Path - Reuses DB steps
    D -->|"Yes (Few DBs, Low Duplication)"| E[Implement NestJS Hexagonal Backend Logic<br>with FaaS DB Adapter DynamoDB]
    E --> G{Migrate DB now?<br>Optional}
    G -->|No| H[End: Functional IaaS Monolith<br>using FaaS DB]
    G -->|Yes| L

    %% Finalization - All paths converge here
    N --> H

    %% Styles
    classDef decisionNode fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef processNode fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef endNode fill:#e8f5e8,stroke:#1b5e20,stroke-width:3px
    
    class D,G decisionNode
    class A,B,C,E,L,M,N processNode
    class H endNode
```

## Flow Description

### 🔍 **Analysis Phase**
1. **Analyze Backend**: Generate OpenAPI specification from FaaS code
2. **Analyze Data**: Document database structure from IaC and code

### 🤔 **Strategic Decision Point**
**Is a 2-stage migration viable?**
- **Criteria for YES**: Few databases, low data duplication
- **Criteria for NO**: Many databases, high duplication/complexity

### 🛤️ **Two Migration Paths**

#### **Path 1: 2-Stage Migration** 🟢
- **Advantages**: Lower initial risk, incremental migration
- **Process**:
  1. Implement NestJS backend with adapters for existing DB (e.g., DynamoDB)
  2. **Optional decision**: Migrate DB later by reusing unified path steps

#### **Path 2: Unified Migration** 🔴  
- **Advantages**: Final architecture from the start, better for complex cases
- **Process**:
  1. Design relational DB schema
  2. Implement NestJS backend with SQL adapters
  3. Migrate data directly

### 🎯 **Final Result**
Both paths converge to: **Functional IaaS Monolith**

## Application Example: PetStore

The PetStore project followed the **Unified Path** because:
- ✅ Only 2 DynamoDB tables (simple structure)
- ✅ Clear relationships (franchise → stores)
- ✅ No complex data duplication
- ✅ Immediate benefit from relational DB

## NestJS Hexagonal Architecture

Both paths implement **Hexagonal Architecture (Ports and Adapters)**:

```
┌─────────────────────────────────────────┐
│             NestJS Application          │
│  ┌─────────────────────────────────────┐ │
│  │        Business Logic Core         │ │
│  │     (Domain Services & Entities)    │ │
│  └─────────────────────────────────────┘ │
│              ▲              ▲            │
│              │              │            │
│         ┌────────┐     ┌──────────┐      │
│         │  HTTP  │     │Database  │      │
│         │  Port  │     │   Port   │      │
│         └────────┘     └──────────┘      │
└─────────────────────────────────────────┘
              ▲              ▲
              │              │
    ┌─────────────┐    ┌─────────────┐
    │    REST     │    │  Database   │
    │   Adapter   │    │   Adapter   │
    │(Controllers)│    │(DynamoDB/SQL)│
    └─────────────┘    └─────────────┘
```

This architecture allows easy switching between database adapters (DynamoDB ↔ PostgreSQL) without affecting business logic.

## Framework Benefits

### 🎯 **Decision Support**
- **Clear criteria** for choosing migration strategy
- **Risk assessment** based on database complexity
- **Flexible approach** allowing phased or unified migration

### 🏗️ **Implementation Guidance**
- **Hexagonal Architecture** ensures clean separation of concerns
- **Adapter pattern** enables database technology changes
- **Incremental approach** reduces migration risks

### 📊 **Validation Process**
- **API analysis** through OpenAPI specification generation
- **Database assessment** through IaC and code analysis
- **Informed decision making** based on complexity metrics

This framework provides a systematic approach to FaaS-to-IaaS migration, reducing complexity and ensuring architectural quality in the resulting monolithic application.