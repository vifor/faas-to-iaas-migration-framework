import { Controller, Get } from '@nestjs/common';
import { 
  HealthCheck, 
  HealthCheckService, 
  HealthCheckResult 
} from '@nestjs/terminus';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly healthCheckService: HealthCheckService,
    private readonly healthService: HealthService,
  ) {}

  @Get()
  @HealthCheck()
  async check(): Promise<HealthCheckResult> {
    return this.healthCheckService.check([
      () => this.healthService.checkApplication(),
      () => this.healthService.checkDatabase(),
      () => this.healthService.checkMemory(),
    ]);
  }

  @Get('app')
  @HealthCheck()
  async checkApp(): Promise<HealthCheckResult> {
    return this.healthCheckService.check([
      () => this.healthService.checkApplication(),
    ]);
  }

  @Get('database')
  @HealthCheck()
  async checkDatabase(): Promise<HealthCheckResult> {
    return this.healthCheckService.check([
      () => this.healthService.checkDatabase(),
    ]);
  }

  @Get('memory')
  @HealthCheck()
  async checkMemory(): Promise<HealthCheckResult> {
    return this.healthCheckService.check([
      () => this.healthService.checkMemory(),
    ]);
  }
}