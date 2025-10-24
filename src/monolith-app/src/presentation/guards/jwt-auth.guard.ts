import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: string; // User ID
  email: string;
  storeId?: string;
  role: 'store_owner' | 'store_employee' | 'customer';
  iat: number;
  exp: number;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

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
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.get('JWT_SECRET'),
      });

      // Add user information to request for use in controllers
      request.user = {
        id: payload.sub,
        email: payload.email,
        storeId: payload.storeId,
        role: payload.role,
      };

      return true;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException({
          error: 'Unauthorized',
          message: 'Token has expired. Please obtain a new token.',
          statusCode: 401,
        });
      }

      if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedException({
          error: 'Unauthorized',
          message: 'Invalid token. Please provide a valid JWT token.',
          statusCode: 401,
        });
      }

      throw new UnauthorizedException({
        error: 'Unauthorized',
        message: 'Token validation failed. Please try again.',
        statusCode: 401,
      });
    }
  }
}