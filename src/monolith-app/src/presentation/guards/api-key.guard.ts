import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) {
      throw new UnauthorizedException({
        error: 'Unauthorized',
        message: 'API key is required. Please provide a valid x-api-key header.',
        statusCode: 401,
      });
    }

    const validApiKey = this.configService.get('ADMIN_API_KEY');
    
    if (!validApiKey) {
      throw new UnauthorizedException({
        error: 'Unauthorized',
        message: 'Server configuration error. API key validation is not properly configured.',
        statusCode: 401,
      });
    }

    if (apiKey !== validApiKey) {
      throw new UnauthorizedException({
        error: 'Unauthorized',
        message: 'Invalid API key. Please check your x-api-key header value.',
        statusCode: 401,
      });
    }

    return true;
  }
}