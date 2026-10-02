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
    /^https:\/\/.*\.vercel\.app$/,
    /^https:\/\/.*\.pages\.dev$/,
  ];

  if (process.env.FRONTEND_URL) {
    const customOrigins = process.env.FRONTEND_URL.split(',')
      .map((url) => url.trim())
      .filter(Boolean);
    allowedOrigins.push(...customOrigins);
  }

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
    .setTitle('MobileCommerce API')
    .setDescription(
      'Backend API for MobileCommerce - Mobile Phone E-Commerce System',
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
    `🚀 MobileCommerce API running on http://localhost:${port}/api`,
  );

  console.log(
    `📚 Swagger documentation: http://localhost:${port}/api/docs`,
  );
}

bootstrap();
