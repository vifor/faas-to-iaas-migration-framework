import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
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
  getDatabaseHealth() {
    return {
      status: 'ok',
      database: 'DynamoDB',
      region: process.env.AWS_REGION || 'us-east-1',
      timestamp: new Date().toISOString(),
    };
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