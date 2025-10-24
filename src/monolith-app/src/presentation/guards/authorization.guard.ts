/**
 * Authorization Guard
 * 
 * Implements resource-level authorization using the custom authorization service
 * that replicates AWS Verified Permissions behavior. This guard performs
 * fine-grained access control based on user context, action, and resource.
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthorizationService, UserContext } from '../../application/services/authorization.service';

// Decorator metadata keys
export const AUTHORIZATION_ACTION = 'authorization_action';
export const AUTHORIZATION_RESOURCE = 'authorization_resource';
export const SKIP_AUTHORIZATION = 'skip_authorization';

// Decorator for setting required action
export const RequireAction = (action: string) => {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata(AUTHORIZATION_ACTION, action, descriptor.value);
    } else {
      Reflect.defineMetadata(AUTHORIZATION_ACTION, action, target);
    }
  };
};

// Decorator for setting resource type
export const RequireResource = (resourceType: string) => {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata(AUTHORIZATION_RESOURCE, resourceType, descriptor.value);
    } else {
      Reflect.defineMetadata(AUTHORIZATION_RESOURCE, resourceType, target);
    }
  };
};

// Decorator for skipping authorization
export const SkipAuthorization = () => {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata(SKIP_AUTHORIZATION, true, descriptor.value);
    } else {
      Reflect.defineMetadata(SKIP_AUTHORIZATION, true, target);
    }
  };
};

@Injectable()
export class AuthorizationGuard implements CanActivate {
  private readonly logger = new Logger(AuthorizationGuard.name);

  constructor(
    private readonly authorizationService: AuthorizationService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();
    const controller = context.getClass();

    // Check if authorization should be skipped
    const skipAuth = this.reflector.getAllAndOverride<boolean>(SKIP_AUTHORIZATION, [
      handler,
      controller,
    ]);

    if (skipAuth) {
      this.logger.debug('🔓 Authorization skipped for this endpoint');
      return true;
    }

    // Check if user is authenticated (should be done by JWT/API Key guards first)
    if (!request.user) {
      this.logger.warn('❌ No user context found in request - authentication required first');
      throw new ForbiddenException({
        error: 'Forbidden',
        message: 'User authentication required before authorization',
        statusCode: 403,
      });
    }

    try {
      // Get action from metadata or derive from route
      let action = this.reflector.getAllAndOverride<string>(AUTHORIZATION_ACTION, [
        handler,
        controller,
      ]);

      if (!action) {
        action = this.deriveActionFromRoute(request.method, request.route?.path || request.url);
      }

      // Get resource type from metadata or derive from route
      let resourceType = this.reflector.getAllAndOverride<string>(AUTHORIZATION_RESOURCE, [
        handler,
        controller,
      ]);

      if (!resourceType) {
        resourceType = this.deriveResourceTypeFromRoute(request.route?.path || request.url);
      }

      // Extract resource ID from path parameters
      const resourceId = this.extractResourceId(request.params, action);

      // Build user context from JWT payload or API key context
      const userContext = this.buildUserContext(request.user);

      this.logger.debug(`🔍 Authorization check: Action=${action}, ResourceType=${resourceType}, ResourceId=${resourceId}, User=${userContext.userId}`);

      // Perform authorization check
      const authResult = await this.authorizationService.isAuthorized(
        userContext,
        action,
        resourceType,
        resourceId,
        request.params
      );

      if (authResult.decision === 'ALLOW') {
        this.logger.log(`✅ Authorization granted: ${authResult.message}`);
        
        // Add authorization context to request for use in controllers
        request.authContext = {
          action,
          resourceType,
          resourceId,
          policies: authResult.determiningPolicies,
        };

        return true;
      } else {
        this.logger.warn(`❌ Authorization denied: ${authResult.message}`);
        throw new ForbiddenException({
          error: 'Forbidden',
          message: authResult.message,
          statusCode: 403,
          details: {
            action,
            resourceType,
            resourceId,
            determiningPolicies: authResult.determiningPolicies,
          },
        });
      }

    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      this.logger.error(`❌ Authorization error: ${error.message}`, error.stack);
      throw new ForbiddenException({
        error: 'Forbidden',
        message: 'Authorization check failed',
        statusCode: 403,
      });
    }
  }

  /**
   * Derive action from HTTP method and route path
   */
  private deriveActionFromRoute(method: string, path: string): string {
    // Normalize path to match action mapping
    const normalizedPath = path
      .replace(/\/api\/v1/, '') // Remove API prefix
      .replace(/:(\w+)/g, '{$1}'); // Convert :param to {param}

    return this.authorizationService.getActionFromRoute(method, normalizedPath);
  }

  /**
   * Derive resource type from route path
   */
  private deriveResourceTypeFromRoute(path: string): string {
    if (path.includes('/pet/')) {
      return 'MyApplication::Pet';
    } else if (path.includes('/order/')) {
      return 'MyApplication::Order';
    } else if (path.includes('/store/')) {
      return 'MyApplication::Store';
    } else if (path.includes('/franchise/')) {
      return 'MyApplication::StoreFranchise';
    } else {
      return 'MyApplication::Application';
    }
  }

  /**
   * Extract resource ID from path parameters based on action
   */
  private extractResourceId(params: any, action: string): string {
    if (['UpdatePet', 'DeletePet'].includes(action) && params.petId) {
      return params.petId;
    } else if (['GetOrder', 'CancelOrder'].includes(action) && params.orderNumber) {
      return params.orderNumber;
    } else if (params.storeId) {
      return params.storeId;
    } else if (params.franchiseId) {
      return params.franchiseId;
    } else {
      return 'PetStore'; // Default application resource
    }
  }

  /**
   * Build user context from request user (set by authentication guards)
   */
  private buildUserContext(requestUser: any): UserContext {
    // Handle JWT authentication context
    if (requestUser.email && !requestUser.isApiKeyAuth) {
      return this.authorizationService.extractUserContext(requestUser);
    }

    // Handle API key authentication context (limited permissions)
    if (requestUser.isApiKeyAuth) {
      return {
        userId: requestUser.id || 'api-client',
        email: requestUser.email || 'api@petstore.com',
        groups: requestUser.role === 'admin' ? ['AdminRole'] : ['ApiClientRole'],
        employmentStoreCodes: [], // API keys don't have store associations
        employmentStoreFranchiseCodes: [], // API keys don't have franchise associations
        role: requestUser.role || 'api_client',
      };
    }

    // Fallback for other authentication types
    return {
      userId: requestUser.id || requestUser.sub || 'unknown',
      email: requestUser.email || 'unknown@petstore.com',
      groups: requestUser.groups || [],
      employmentStoreCodes: requestUser.employmentStoreCodes || [],
      employmentStoreFranchiseCodes: requestUser.franchiseCodes || [],
      role: requestUser.role || 'customer',
    };
  }
}