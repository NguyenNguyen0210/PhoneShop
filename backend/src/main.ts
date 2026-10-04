// IMPORTANT: load .env FIRST, before any other import. Several modules read
// process.env at import time (e.g. REDIS_ENABLED in background-jobs and
// orders modules to decide between real BullMQ queues and the local
// fallback). Nest's ConfigModule populates process.env only later during
// bootstrap — too late for those constants. This import runs first because
// ES imports execute depth-first in source order.
import 'dotenv/config';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import helmet from 'helmet';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ============================================================
  // SECURITY (HELMET & CORS)
  // ============================================================

  app.use(helmet({
    contentSecurityPolicy: false,
  }));

  const allowedOrigins: (string | RegExp)[] = [
    'http://localhost:5173',
    'http://localhost:3000',
    process.env.FRONTEND_URL || '',
    /^https:\/\/phoneshop(-[a-z0-9-]+)?\.vercel\.app$/,
    /^https:\/\/phoneshop(-[a-z0-9-]+)?\.pages\.dev$/,
  ].filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (such as mobile apps, curl, server-to-server)
      if (!origin) {
        return callback(null, true);
      }

      const isAllowed = allowedOrigins.some((allowed) => {
        if (typeof allowed === 'string') {
          return allowed === origin;
        }
        return allowed.test(origin);
      });

      if (isAllowed) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: [
      'Content-Type',
      'Accept',
      'Authorization',
      'X-Requested-With',
      'Idempotency-Key',
    ],
    credentials: true,
  });

  // ============================================================
  // GLOBAL VALIDATION
  // ============================================================

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ============================================================
  // GLOBAL EXCEPTION HANDLING
  // ============================================================

  app.useGlobalFilters(new HttpExceptionFilter());

  // ============================================================
  // GLOBAL RESPONSE FORMAT
  // ============================================================

  app.useGlobalInterceptors(new ResponseInterceptor());

  // ============================================================
  // GLOBAL PREFIX
  // ============================================================

  app.setGlobalPrefix('api');

  // ============================================================
  // SWAGGER
  // ============================================================

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Phone Shop API')
    .setDescription(
      'Backend API for Phone Shop - Mobile Phone E-Commerce System',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT access token',
      },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup('api/docs', app, document);

  // ============================================================
  // SERVER
  // ============================================================

  const configService = app.get(ConfigService);

  const port = configService.get<number>('PORT') ?? 3000;

  await app.listen(port);

  console.log(
    `🚀 Phone Shop API running on http://localhost:${port}/api`,
  );

  console.log(
    `📚 Swagger documentation: http://localhost:${port}/api/docs`,
  );
}

bootstrap();
