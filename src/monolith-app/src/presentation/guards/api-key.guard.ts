import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../../application/services/auth.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) {
      throw new UnauthorizedException({
        error: 'Unauthorized',
        message: 'API key is required. Please provide a valid x-api-key header.',
        statusCode: 401,
      });
    }

    try {
      // First check against configured admin API key
      const validApiKey = this.configService.get('ADMIN_API_KEY');
      
      if (validApiKey && apiKey === validApiKey) {
        // Add admin context to request
        request.user = {
          id: 'admin',
          email: 'admin@petstore.com',
          role: 'admin',
          isApiKeyAuth: true,
        };
        return true;
      }

      // Then validate against dynamic API keys using AuthService
      const isValid = await this.authService.validateApiKey(apiKey);
      
      if (!isValid) {
        throw new UnauthorizedException({
          error: 'Unauthorized',
          message: 'Invalid API key. Please check your x-api-key header value.',
          statusCode: 401,
        });
      }

      // Add API key context to request
      request.user = {
        id: 'api-client',
        email: 'api@petstore.com',
        role: 'api_client',
        isApiKeyAuth: true,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException({
        error: 'Unauthorized',
        message: 'API key validation failed. Please try again.',
        statusCode: 401,
      });
    }
  }
}