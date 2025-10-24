/**
 * Authorization Service
 * 
 * Implements a custom authorization system that replicates AWS Verified Permissions behavior.
 * This service evaluates Cedar-like policies against user context, action, and resource
 * to make authorization decisions for the Pet Store application.
 * 
 * The service transforms DynamoDB entities into Cedar-compatible entities and evaluates
 * permissions based on franchise/store hierarchy, user roles, and resource ownership.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Inject } from '@nestjs/common';

import { IFranchiseRepository } from '../../domain/repositories/franchise.repository.interface';
import { IStoreRepository } from '../../domain/repositories/store.repository.interface';
import { Franchise } from '../../domain/entities/franchise.entity';
import { Store } from '../../domain/entities/store.entity';

// Authorization interfaces
export interface AuthorizationContext {
  principal: EntityIdentifier;
  action: ActionIdentifier;
  resource: EntityIdentifier;
  entities: EntityMap;
}

export interface EntityIdentifier {
  entityType: string;
  entityId: string;
}

export interface ActionIdentifier {
  actionType: string;
  actionId: string;
}

export interface AuthorizationResult {
  decision: 'ALLOW' | 'DENY';
  determiningPolicies: string[];
  message: string;
  errors?: string[];
}

export interface CedarEntity {
  identifier: EntityIdentifier;
  attributes?: Record<string, any>;
  parents?: EntityIdentifier[];
}

export interface EntityMap {
  entityList: CedarEntity[];
}

export interface UserContext {
  userId: string;
  email: string;
  groups: string[];
  employmentStoreCodes: string[];
  employmentStoreFranchiseCodes: string[];
  role: string;
}

export interface Policy {
  id: string;
  effect: 'permit' | 'forbid';
  principal: PolicyPattern;
  action: PolicyPattern;
  resource: PolicyPattern;
  condition?: PolicyCondition;
}

export interface PolicyPattern {
  entityType?: string;
  entityId?: string;
  in?: string; // For group membership checks
  has?: string; // For attribute checks
}

export interface PolicyCondition {
  type: 'equal' | 'in' | 'has' | 'and' | 'or';
  left?: string;
  right?: any;
  conditions?: PolicyCondition[];
}

// Action mapping from HTTP method + path to Cedar action
const ACTION_MAP: Record<string, string> = {
  'GET/store/{storeId}/pets': 'SearchPets',
  'POST/store/{storeId}/pet/create': 'AddPet',
  'POST/store/{storeId}/order/create': 'PlaceOrder',
  'POST/store/{storeId}/pet/update/{petId}': 'UpdatePet',
  'DELETE/store/{storeId}/pet/{petId}': 'DeletePet',
  'GET/store/{storeId}/order/get/{orderNumber}': 'GetOrder',
  'POST/store/{storeId}/order/cancel/{orderNumber}': 'CancelOrder',
  'GET/store/{storeId}/orders': 'ListOrders',
  'GET/store/{storeId}/inventory': 'GetStoreInventory',
};

@Injectable()
export class AuthorizationService {
  private readonly logger = new Logger(AuthorizationService.name);
  private readonly policies: Policy[] = [];

  constructor(
    private readonly configService: ConfigService,
    @Inject('IFranchiseRepository')
    private readonly franchiseRepository: IFranchiseRepository,
    @Inject('IStoreRepository')
    private readonly storeRepository: IStoreRepository,
  ) {
    this.initializePolicies();
    this.logger.log('🔐 Authorization Service initialized with Cedar-like policy engine');
  }

  /**
   * Main authorization check - replicates AWS Verified Permissions behavior
   */
  async isAuthorized(
    userContext: UserContext,
    action: string,
    resourceType: string,
    resourceId: string,
    pathParams?: Record<string, string>
  ): Promise<AuthorizationResult> {
    try {
      this.logger.debug(`🔍 Authorization check: User=${userContext.userId}, Action=${action}, Resource=${resourceType}:${resourceId}`);

      // Build authorization context similar to Lambda authorizer
      const authContext = await this.buildAuthorizationContext(
        userContext,
        action,
        resourceType,
        resourceId,
        pathParams
      );

      // Evaluate policies
      const result = await this.evaluatePolicies(authContext);

      this.logger.log(`${result.decision === 'ALLOW' ? '✅' : '❌'} Authorization ${result.decision}: ${result.message}`);
      return result;

    } catch (error) {
      this.logger.error(`❌ Authorization error: ${error.message}`, error.stack);
      return {
        decision: 'DENY',
        determiningPolicies: [],
        message: 'Authorization evaluation failed',
        errors: [error.message]
      };
    }
  }

  /**
   * Build authorization context - transforms entities like Lambda authorizer
   */
  private async buildAuthorizationContext(
    userContext: UserContext,
    action: string,
    resourceType: string,
    resourceId: string,
    pathParams?: Record<string, string>
  ): Promise<AuthorizationContext> {
    const entities: CedarEntity[] = [];

    // Add user entity (principal)
    const userEntity = await this.transformUserEntity(userContext);
    entities.push(userEntity);

    // Add group entities
    userContext.groups.forEach(group => {
      entities.push({
        identifier: {
          entityType: 'MyApplication::Group',
          entityId: group
        }
      });
    });

    // Add store entities for user employment
    for (const storeCode of userContext.employmentStoreCodes) {
      try {
        // Parse store code to get composite key components (id#value format)
        const parts = storeCode.split('#');
        if (parts.length === 2) {
          const store = await this.storeRepository.findByCompositeKey(parts[0], parts[1]);
          if (store) {
            entities.push(await this.transformStoreEntity(store));
          }
        } else {
          // Try to find by ID query if not in composite format
          const stores = await this.storeRepository.findByIdQuery(storeCode);
          if (stores.length > 0) {
            entities.push(await this.transformStoreEntity(stores[0]));
          }
        }
      } catch (error) {
        this.logger.warn(`Could not load store ${storeCode}: ${error.message}`);
      }
    }

    // Add franchise entities for user employment
    for (const franchiseCode of userContext.employmentStoreFranchiseCodes) {
      try {
        const franchise = await this.franchiseRepository.findById(franchiseCode);
        if (franchise) {
          entities.push(await this.transformFranchiseEntity(franchise));
        }
      } catch (error) {
        this.logger.warn(`Could not load franchise ${franchiseCode}: ${error.message}`);
      }
    }

    // Add resource entities based on action and path parameters
    if (pathParams) {
      await this.addResourceEntities(entities, action, pathParams);
    }

    return {
      principal: {
        entityType: 'MyApplication::User',
        entityId: userContext.userId
      },
      action: {
        actionType: 'MyApplication::Action',
        actionId: action
      },
      resource: this.buildResource(action, resourceType, resourceId, pathParams),
      entities: { entityList: entities }
    };
  }

  /**
   * Transform user context to Cedar entity - replicates Lambda authorizer logic
   */
  private async transformUserEntity(userContext: UserContext): Promise<CedarEntity> {
    const userEntity: CedarEntity = {
      identifier: {
        entityType: 'MyApplication::User',
        entityId: userContext.userId
      },
      attributes: {
        employmentStoreCodes: {
          set: userContext.employmentStoreCodes.map(storeId => ({
            entityIdentifier: {
              entityType: 'MyApplication::Store',
              entityId: storeId
            }
          }))
        },
        employmentStoreFranchiseCodes: {
          set: userContext.employmentStoreFranchiseCodes.map(franchiseId => ({
            entityIdentifier: {
              entityType: 'MyApplication::StoreFranchise',
              entityId: franchiseId
            }
          }))
        }
      },
      parents: userContext.groups.map(group => ({
        entityType: 'MyApplication::Group',
        entityId: group
      }))
    };

    return userEntity;
  }

  /**
   * Transform Store domain entity to Cedar entity
   */
  private async transformStoreEntity(store: Store): Promise<CedarEntity> {
    const storeEntity: CedarEntity = {
      identifier: {
        entityType: 'MyApplication::Store',
        entityId: store.getUniqueId() // Use composite key format: id#value
      },
      attributes: {
        geo: store.address || 'unknown'
      }
    };

    // Add franchise parent if store belongs to franchise
    if (store.franchiseId) {
      storeEntity.parents = [{
        entityType: 'MyApplication::StoreFranchise',
        entityId: store.franchiseId
      }];
    }

    return storeEntity;
  }

  /**
   * Transform Franchise domain entity to Cedar entity
   */
  private async transformFranchiseEntity(franchise: Franchise): Promise<CedarEntity> {
    // Get stores for this franchise
    const stores = await this.storeRepository.findByFranchiseId(franchise.id);

    const franchiseEntity: CedarEntity = {
      identifier: {
        entityType: 'MyApplication::StoreFranchise',
        entityId: franchise.id
      },
      attributes: {
        name: franchise.name,
        stores: {
          set: stores.map(store => ({
            entityIdentifier: {
              entityType: 'MyApplication::Store',
              entityId: store.id
            }
          }))
        }
      }
    };

    return franchiseEntity;
  }

  /**
   * Add resource entities based on action and path parameters - replicates Lambda logic
   */
  private async addResourceEntities(
    entities: CedarEntity[],
    action: string,
    pathParams: Record<string, string>
  ): Promise<void> {
    const { storeId, petId, orderNumber } = pathParams;

    if (['UpdatePet', 'DeletePet'].includes(action) && petId) {
      // Pet-related action
      entities.push({
        identifier: {
          entityType: 'MyApplication::Pet',
          entityId: petId
        },
        attributes: {
          store: {
            entityIdentifier: {
              entityType: 'MyApplication::Store',
              entityId: storeId
            }
          }
        }
      });
    } else if (['GetOrder', 'CancelOrder'].includes(action) && orderNumber) {
      // Order-related action
      entities.push({
        identifier: {
          entityType: 'MyApplication::Order',
          entityId: orderNumber
        },
        attributes: {
          store: {
            entityIdentifier: {
              entityType: 'MyApplication::Store',
              entityId: storeId
            }
          },
          // Note: In production, owner would be determined from database
          owner: {
            entityIdentifier: {
              entityType: 'MyApplication::User',
              entityId: 'abhi' // Hardcoded for demo like Lambda
            }
          }
        }
      });
    } else if (storeId) {
      // Application-related action
      entities.push({
        identifier: {
          entityType: 'MyApplication::Application',
          entityId: 'PetStore'
        },
        attributes: {
          store: {
            entityIdentifier: {
              entityType: 'MyApplication::Store',
              entityId: storeId
            }
          }
        }
      });
    }
  }

  /**
   * Build resource identifier based on action and parameters
   */
  private buildResource(
    action: string,
    resourceType: string,
    resourceId: string,
    pathParams?: Record<string, string>
  ): EntityIdentifier {
    if (!pathParams) {
      return { entityType: resourceType, entityId: resourceId };
    }

    const { storeId, petId, orderNumber } = pathParams;

    if (['UpdatePet', 'DeletePet'].includes(action) && petId) {
      return {
        entityType: 'MyApplication::Pet',
        entityId: petId
      };
    } else if (['GetOrder', 'CancelOrder'].includes(action) && orderNumber) {
      return {
        entityType: 'MyApplication::Order',
        entityId: orderNumber
      };
    } else if (['ListOrders'].includes(action) && storeId) {
      return {
        entityType: 'MyApplication::Store',
        entityId: storeId
      };
    } else {
      return {
        entityType: 'MyApplication::Application',
        entityId: 'PetStore'
      };
    }
  }

  /**
   * Evaluate policies against authorization context - Cedar-like evaluation
   */
  private async evaluatePolicies(context: AuthorizationContext): Promise<AuthorizationResult> {
    for (const policy of this.policies) {
      const evaluation = this.evaluatePolicy(policy, context);
      if (evaluation.matches) {
        return {
          decision: policy.effect === 'permit' ? 'ALLOW' : 'DENY',
          determiningPolicies: [policy.id],
          message: `${policy.effect === 'permit' ? 'Access granted' : 'Access denied'} by policy ${policy.id}`
        };
      }
    }

    // Default deny if no policies match
    return {
      decision: 'DENY',
      determiningPolicies: [],
      message: 'No matching policies found - default deny'
    };
  }

  /**
   * Evaluate individual policy - simplified Cedar evaluation
   */
  private evaluatePolicy(policy: Policy, context: AuthorizationContext): { matches: boolean; reason?: string } {
    // Check principal match
    if (!this.matchesPattern(policy.principal, context.principal, context.entities, 'principal')) {
      return { matches: false, reason: 'Principal does not match' };
    }

    // Check action match
    if (!this.matchesPattern(policy.action, context.action, context.entities, 'action')) {
      return { matches: false, reason: 'Action does not match' };
    }

    // Check resource match (simplified - always matches for basic policies)
    // In production, this would include more sophisticated resource matching

    // Check conditions if present
    if (policy.condition) {
      if (!this.evaluateCondition(policy.condition, context)) {
        return { matches: false, reason: 'Condition evaluation failed' };
      }
    }

    return { matches: true };
  }

  /**
   * Match policy pattern against context entity
   */
  private matchesPattern(
    pattern: PolicyPattern,
    entity: EntityIdentifier | ActionIdentifier,
    entities: EntityMap,
    type: 'principal' | 'action' | 'resource'
  ): boolean {
    if (type === 'principal' && pattern.in) {
      // Check group membership - cast entity to EntityIdentifier for principal
      const principalEntity = entity as EntityIdentifier;
      const userEntity = entities.entityList.find(e => 
        e.identifier.entityType === 'MyApplication::User' && 
        e.identifier.entityId === principalEntity.entityId
      );
      
      if (userEntity?.parents) {
        return userEntity.parents.some(parent => 
          parent.entityType === 'MyApplication::Group' && 
          parent.entityId === pattern.in
        );
      }
    }

    // For action entities, check actionType and actionId
    if (type === 'action') {
      const actionEntity = entity as ActionIdentifier;
      if (pattern.entityType && pattern.entityType !== actionEntity.actionType) {
        return false;
      }
      if (pattern.entityId && pattern.entityId !== actionEntity.actionId) {
        return false;
      }
      return true;
    }

    // For principal and resource entities, check entityType and entityId  
    if (type === 'principal' || type === 'resource') {
      const entityIdentifier = entity as EntityIdentifier;
      if (pattern.entityType && pattern.entityType !== entityIdentifier.entityType) {
        return false;
      }
      if (pattern.entityId && pattern.entityId !== entityIdentifier.entityId) {
        return false;
      }
      return true;
    }

    return false;
  }

  /**
   * Evaluate policy conditions
   */
  private evaluateCondition(condition: PolicyCondition, context: AuthorizationContext): boolean {
    // Simplified condition evaluation - in production would be more comprehensive
    switch (condition.type) {
      case 'has':
        return this.evaluateHasCondition(condition, context);
      case 'in':
        return this.evaluateInCondition(condition, context);
      case 'equal':
        return this.evaluateEqualCondition(condition, context);
      default:
        this.logger.warn(`Unsupported condition type: ${condition.type}`);
        return false;
    }
  }

  private evaluateHasCondition(condition: PolicyCondition, context: AuthorizationContext): boolean {
    // Check if principal has specific attribute
    const userEntity = context.entities.entityList.find(e =>
      e.identifier.entityType === 'MyApplication::User' &&
      e.identifier.entityId === context.principal.entityId
    );

    return userEntity?.attributes && condition.left && userEntity.attributes[condition.left] !== undefined;
  }

  private evaluateInCondition(condition: PolicyCondition, context: AuthorizationContext): boolean {
    // Check if resource is in principal's employment entities
    const userEntity = context.entities.entityList.find(e =>
      e.identifier.entityType === 'MyApplication::User' &&
      e.identifier.entityId === context.principal.entityId
    );

    if (!userEntity?.attributes || !condition.left) return false;

    const employmentEntities = userEntity.attributes[condition.left];
    if (!employmentEntities?.set) return false;

    // Check if current resource is in the user's employment entities
    return employmentEntities.set.some((entity: any) =>
      entity.entityIdentifier.entityId === context.resource.entityId ||
      this.isResourceInEntity(context.resource, entity.entityIdentifier, context.entities)
    );
  }

  private evaluateEqualCondition(condition: PolicyCondition, context: AuthorizationContext): boolean {
    // Simple equality check - would be more sophisticated in production
    return condition.left === condition.right;
  }

  /**
   * Check if resource belongs to entity (e.g., order belongs to store)
   */
  private isResourceInEntity(resource: EntityIdentifier, entity: EntityIdentifier, entities: EntityMap): boolean {
    // Find resource entity and check its store attribute
    const resourceEntity = entities.entityList.find(e =>
      e.identifier.entityType === resource.entityType &&
      e.identifier.entityId === resource.entityId
    );

    if (resourceEntity?.attributes?.store?.entityIdentifier) {
      return resourceEntity.attributes.store.entityIdentifier.entityId === entity.entityId;
    }

    return false;
  }

  /**
   * Initialize Cedar-like policies - replicates AWS Verified Permissions policies
   */
  private initializePolicies(): void {
    // Customer Policy 1: Allow customers to search pets and place orders
    this.policies.push({
      id: 'CustomerPolicy1',
      effect: 'permit',
      principal: { in: 'Customer' },
      action: { entityType: 'MyApplication::Action' }, // Matches SearchPets, PlaceOrder
      resource: { entityType: 'MyApplication::Store' }
    });

    // Customer Policy 2: Allow customers to get their own orders
    this.policies.push({
      id: 'CustomerPolicy2',
      effect: 'permit',
      principal: { in: 'Customer' },
      action: { entityType: 'MyApplication::Action', entityId: 'GetOrder' },
      resource: { entityType: 'MyApplication::Order' },
      condition: {
        type: 'equal',
        left: 'principal',
        right: 'resource.owner'
      }
    });

    // Franchise Owner Policy 1: Allow franchise owners to access stores in their franchise
    this.policies.push({
      id: 'FranchiseOwnerPolicy1',
      effect: 'permit',
      principal: { in: 'FranchiseOwnerRole' },
      action: { entityType: 'MyApplication::Action' }, // GetStoreInventory, ListOrders
      resource: { entityType: 'MyApplication::Store' },
      condition: {
        type: 'and',
        conditions: [
          { type: 'has', left: 'employmentStoreFranchiseCodes' },
          { type: 'in', left: 'employmentStoreFranchiseCodes' }
        ]
      }
    });

    // Franchise Owner Policy 2: Allow franchise owners to view orders in their franchise
    this.policies.push({
      id: 'FranchiseOwnerPolicy2',
      effect: 'permit',
      principal: { in: 'FranchiseOwnerRole' },
      action: { entityType: 'MyApplication::Action', entityId: 'GetOrder' },
      resource: { entityType: 'MyApplication::Order' },
      condition: {
        type: 'and',
        conditions: [
          { type: 'has', left: 'employmentStoreFranchiseCodes' },
          { type: 'in', left: 'employmentStoreFranchiseCodes' }
        ]
      }
    });

    // Store Owner Policy 1: Allow store owners to access their stores
    this.policies.push({
      id: 'StoreOwnerPolicy1',
      effect: 'permit',
      principal: { in: 'StoreOwnerRole' },
      action: { entityType: 'MyApplication::Action' }, // GetStoreInventory, ListOrders
      resource: { entityType: 'MyApplication::Store' },
      condition: {
        type: 'in',
        left: 'employmentStoreCodes'
      }
    });

    // Store Owner Policy 2: Allow store owners to view orders in their stores
    this.policies.push({
      id: 'StoreOwnerPolicy2',
      effect: 'permit',
      principal: { in: 'StoreOwnerRole' },
      action: { entityType: 'MyApplication::Action', entityId: 'GetOrder' },
      resource: { entityType: 'MyApplication::Order' },
      condition: {
        type: 'in',
        left: 'employmentStoreCodes'
      }
    });

    this.logger.log(`📜 Initialized ${this.policies.length} Cedar-like authorization policies`);
  }

  /**
   * Get action from HTTP method and path - replicates Lambda action mapping
   */
  getActionFromRoute(method: string, path: string): string {
    const key = `${method.toUpperCase()}${path}`;
    return ACTION_MAP[key] || 'UnknownAction';
  }

  /**
   * Extract user context from JWT payload
   */
  extractUserContext(jwtPayload: any): UserContext {
    return {
      userId: jwtPayload.sub || jwtPayload.userId,
      email: jwtPayload.email,
      groups: jwtPayload['cognito:groups'] || jwtPayload.groups || [],
      employmentStoreCodes: (jwtPayload['custom:employmentStoreCode'] || jwtPayload.employmentStoreCodes || '').split(',').filter(Boolean),
      employmentStoreFranchiseCodes: (jwtPayload['custom:franchiseCode'] || jwtPayload.franchiseCodes || '').split(',').filter(Boolean),
      role: jwtPayload.role || 'customer'
    };
  }
}