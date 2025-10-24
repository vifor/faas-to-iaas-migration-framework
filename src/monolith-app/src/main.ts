import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import compression from 'compression';
import helmet from 'helmet';
import cors from 'cors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Get configuration service
  const configService = app.get(ConfigService);
  
  // Security middleware
  app.use(helmet());
  app.use(compression());
  
  // CORS configuration
  app.use(cors({
    origin: configService.get('CORS_ORIGIN', '*'),
    credentials: true,
  }));
  
  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    disableErrorMessages: configService.get('NODE_ENV') === 'production',
  }));
  
  // Global prefix for API routes
  app.setGlobalPrefix('api/v1');
  
  // Start the application
  const port = configService.get('PORT', 3000);
  await app.listen(port);
  
  console.log(`🚀 PetStore Monolith running on port ${port}`);
  console.log(`📝 Environment: ${configService.get('NODE_ENV', 'development')}`);
  console.log(`🔗 Health check: http://localhost:${port}/api/v1/health`);
}

bootstrap();