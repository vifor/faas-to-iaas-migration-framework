import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

export interface CognitoJwtPayload {
  sub: string; // User ID
  email: string;
  email_verified: boolean;
  'cognito:groups'?: string[]; // User groups/roles
  'custom:employmentStoreCode'?: string; // Store association
  'custom:employmentStoreFranchiseCode'?: string; // Franchise association
  aud: string; // Client ID
  iss: string; // Cognito issuer
  token_use: 'access' | 'id';
  iat: number;
  exp: number;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);
  private cognitoVerifier: CognitoJwtVerifier<any, any, boolean>;

  constructor(private readonly configService: ConfigService) {
    // Initialize Cognito JWT verifier
    this.cognitoVerifier = CognitoJwtVerifier.create({
      userPoolId: this.configService.get<string>('COGNITO_USER_POOL_ID'),
      clientId: this.configService.get<string>('COGNITO_CLIENT_ID'),
      tokenUse: 'id', // Verify ID tokens (contains user claims)
    });

    this.logger.log('🔐 Cognito JWT Guard initialized');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException({
        error: 'Unauthorized',
        message: 'Authorization header is required. Please provide a Bearer token.',
        statusCode: 401,
      });
    }

    const [bearer, token] = authHeader.split(' ');

    if (bearer !== 'Bearer' || !token) {
      throw new UnauthorizedException({
        error: 'Unauthorized',
        message: 'Invalid authorization format. Use "Bearer <token>".',
        statusCode: 401,
      });
    }

    try {
      // Verify Cognito JWT token
      const verifiedToken = await this.cognitoVerifier.verify(token);
      const payload = verifiedToken as unknown as CognitoJwtPayload;

      this.logger.debug(`✅ Cognito token verified for user: ${payload.email}`);

      // Extract user context from Cognito token claims
      const userRole = this.extractUserRole(payload['cognito:groups']);
      const storeId = payload['custom:employmentStoreCode'];
      const franchiseCode = payload['custom:employmentStoreFranchiseCode'];

      // Preserve original Cognito JWT payload for AuthorizationService compatibility
      // Add derived fields for convenience but keep original claims
      request.user = {
        // Original Cognito claims (required by AuthorizationService.extractUserContext)
        sub: payload.sub,
        email: payload.email,
        'cognito:groups': payload['cognito:groups'] || [],
        'custom:employmentStoreCode': payload['custom:employmentStoreCode'] || '',
        'custom:employmentStoreFranchiseCode': payload['custom:employmentStoreFranchiseCode'] || '',

        // Derived fields for convenience (backward compatibility)
        id: payload.sub,
        role: userRole,
        storeId: storeId,
        franchiseCode: franchiseCode,
        groups: payload['cognito:groups'] || [],
        employmentStoreCodes: storeId ? [storeId] : [],
        employmentStoreFranchiseCodes: franchiseCode ? [franchiseCode] : [],
        isApiKeyAuth: false, // Mark as Cognito auth (not API key)
      };

      return true;
    } catch (error) {
      this.logger.warn(`❌ Cognito token validation failed: ${error.message}`);

      if (error.name === 'JwtExpiredError') {
        throw new UnauthorizedException({
          error: 'Unauthorized',
          message: 'Token has expired. Please obtain a new token from Cognito.',
          statusCode: 401,
        });
      }

      if (error.name === 'JwtParseError' || error.name === 'JwtInvalidSignatureError') {
        throw new UnauthorizedException({
          error: 'Unauthorized',
          message: 'Invalid Cognito token. Please provide a valid JWT token.',
          statusCode: 401,
        });
      }

      if (error.name === 'JwtInvalidClaimError') {
        throw new UnauthorizedException({
          error: 'Unauthorized',
          message: 'Token validation failed: invalid claims. Please check token configuration.',
          statusCode: 401,
        });
      }

      throw new UnauthorizedException({
        error: 'Unauthorized',
        message: 'Cognito token validation failed. Please try again.',
        statusCode: 401,
      });
    }
  }

  /**
   * Extract user role from Cognito groups
   * Maps Cognito groups to application roles
   */
  private extractUserRole(groups?: string[]): 'store_owner' | 'store_employee' | 'customer' {
    if (!groups || groups.length === 0) {
      return 'customer';
    }

    // Priority mapping: store_owner > store_employee > customer
    if (groups.includes('StoreOwnerRole')) {
      return 'store_owner';
    }

    if (groups.includes('StoreEmployeeRole')) {
      return 'store_employee';
    }

    return 'customer';
  }
}