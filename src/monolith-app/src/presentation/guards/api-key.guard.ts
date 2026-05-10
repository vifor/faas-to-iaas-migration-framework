import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(private readonly configService: ConfigService) {}

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
      // Check against configured admin API key
      const adminApiKey = this.configService.get('ADMIN_API_KEY');

      if (adminApiKey && apiKey === adminApiKey) {
        this.logger.log('✅ Valid admin API key used');
        // Add admin context to request
        request.user = {
          id: 'admin',
          email: 'admin@petstore.com',
          role: 'admin',
          isApiKeyAuth: true,
        };
        return true;
      }

      // Check against configured API keys list
      const validApiKeys = this.configService.get<string>('API_KEYS', '').split(',').filter(key => key.trim());

      if (validApiKeys.includes(apiKey)) {
        this.logger.log('✅ Valid API key used');
        // Add API client context to request
        request.user = {
          id: 'api-client',
          email: 'api@petstore.com',
          role: 'api_client',
          isApiKeyAuth: true,
        };
        return true;
      }

      // API key not found in any valid list
      this.logger.warn('❌ Invalid API key attempted');
      throw new UnauthorizedException({
        error: 'Unauthorized',
        message: 'Invalid API key. Please check your x-api-key header value.',
        statusCode: 401,
      });

    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error(`❌ API key validation error: ${error.message}`);
      throw new UnauthorizedException({
        error: 'Unauthorized',
        message: 'API key validation failed. Please try again.',
        statusCode: 401,
      });
    }
  }
}