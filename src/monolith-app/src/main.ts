import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { GlobalExceptionFilter } from './presentation/filters';
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
  
  // Global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());
  
  // Global prefix for API routes
  app.setGlobalPrefix('api/v1');
  
  // Swagger/OpenAPI configuration
  const config = new DocumentBuilder()
    .setTitle('PetStore API')
    .setDescription(`
      A comprehensive Pet Store API for managing franchises, stores, pets, and orders.
      This IaaS monolithic application provides both administrative operations and customer-facing store operations.

      ## Authentication
      - Admin endpoints (\`/admin/*\`) require API key authentication via \`x-api-key\` header
      - Store endpoints (\`/store/*\`) require JWT Bearer token authentication via \`Authorization\` header

      ## Architecture
      Built on NestJS framework with hexagonal architecture:
      - Domain layer: Business entities and rules
      - Application layer: Use cases and services
      - Infrastructure layer: DynamoDB adapters
      - Presentation layer: REST API controllers
    `)
    .setVersion('1.0.0')
    .setContact('PetStore API Support', '', 'support@petstore.com')
    .setLicense('Apache 2.0', 'https://www.apache.org/licenses/LICENSE-2.0.html')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-api-key',
        in: 'header',
        description: 'API key for administrative operations. Required for all `/admin/*` endpoints.',
      },
      'ApiKeyAuth',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token for store operations. Required for all `/store/*` endpoints. Token contains user identity and permissions.',
      },
      'BearerAuth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tryItOutEnabled: true,
      filter: true,
      displayRequestDuration: true,
    },
    customSiteTitle: 'PetStore API Documentation',
    customfavIcon: '/favicon.ico',
    customCssUrl: undefined,
  });
  
  // Start the application
  const port = configService.get('PORT', 3000);
  await app.listen(port);
  
  console.log(`🚀 PetStore Monolith running on port ${port}`);
  console.log(`📝 Environment: ${configService.get('NODE_ENV', 'development')}`);
  console.log(`🔗 Health check: http://localhost:${port}/api/v1/health`);
  console.log(`📖 API Documentation: http://localhost:${port}/api/docs`);
}

bootstrap();