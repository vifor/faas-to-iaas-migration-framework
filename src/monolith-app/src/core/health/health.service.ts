import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { 
  HealthIndicatorResult, 
  HealthIndicator,
  HealthCheckError 
} from '@nestjs/terminus';

@Injectable()
export class HealthService extends HealthIndicator {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  async checkApplication(): Promise<HealthIndicatorResult> {
    const isHealthy = true; // Basic check - can be expanded
    const result = this.getStatus('app', isHealthy, {
      uptime: process.uptime(),
      environment: this.configService.get('NODE_ENV'),
      version: this.configService.get('app.version'),
      timestamp: new Date().toISOString(),
    });

    if (isHealthy) {
      return result;
    }
    throw new HealthCheckError('Application health check failed', result);
  }

  async checkDatabase(): Promise<HealthIndicatorResult> {
    try {
      // TODO: Add actual DynamoDB connection check
      // For now, return healthy status
      const isHealthy = true;
      
      const result = this.getStatus('database', isHealthy, {
        connection: 'connected',
        tables: {
          franchise: this.configService.get('database.dynamodb.tables.franchise'),
          tenants: this.configService.get('database.dynamodb.tables.tenants'),
        },
        region: this.configService.get('database.dynamodb.region'),
      });

      if (isHealthy) {
        return result;
      }
      throw new HealthCheckError('Database health check failed', result);
    } catch (error) {
      const result = this.getStatus('database', false, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new HealthCheckError('Database health check failed', result);
    }
  }

  async checkMemory(): Promise<HealthIndicatorResult> {
    const memoryUsage = process.memoryUsage();
    const totalMemoryMB = Math.round(memoryUsage.rss / 1024 / 1024);
    const isHealthy = totalMemoryMB < 500; // Alert if using more than 500MB

    const result = this.getStatus('memory', isHealthy, {
      rss: `${totalMemoryMB}MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
      external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`,
    });

    if (isHealthy) {
      return result;
    }
    throw new HealthCheckError('Memory usage too high', result);
  }
}