import { Controller, Get } from '@nestjs/common';
import { DynamoDBService } from '../../database/dynamodb.service';

@Controller('health')
export class HealthController {
  constructor(private readonly dynamoDBService: DynamoDBService) {}

  @Get()
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };
  }

  @Get('app')
  getAppHealth() {
    return {
      status: 'ok',
      service: 'PetStore Monolith',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('database')
  async getDatabaseHealth() {
    try {
      // Test DynamoDB connection by checking table status
      const isHealthy = await this.dynamoDBService.isHealthy();
      
      if (isHealthy) {
        return {
          status: 'ok',
          database: 'DynamoDB',
          region: process.env.AWS_REGION || 'us-east-1',
          endpoint: process.env.DYNAMODB_ENDPOINT || 'AWS',
          tables: {
            franchise: `${process.env.FRANCHISE_TABLE_NAME || 'petstoreFranchise'}${process.env.ENV ? '-' + process.env.ENV : ''}`,
            tenants: `${process.env.TENANTS_TABLE_NAME || 'petstoreTenants'}${process.env.ENV ? '-' + process.env.ENV : ''}`
          },
          timestamp: new Date().toISOString(),
        };
      } else {
        return {
          status: 'error',
          database: 'DynamoDB',
          error: 'DynamoDB connection test failed',
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error) {
      return {
        status: 'error',
        database: 'DynamoDB',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('memory')
  getMemoryHealth() {
    const memoryUsage = process.memoryUsage();
    return {
      status: 'ok',
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
      },
      timestamp: new Date().toISOString(),
    };
  }
}