import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { Request, Response, NextFunction } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());

  // Configure CORS for production and development
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  console.log('🔧 CORS Configuration:');
  console.log('📍 Frontend URL:', frontendUrl);
  console.log('🌍 Environment:', process.env.NODE_ENV);
  console.log('🔗 Allowed Origins:', [
    frontendUrl,
    'https://sdesk-frontend.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001',
  ]);
  // Add request logging middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(
      `🌐 ${req.method} ${req.url} from origin: ${req.headers.origin || 'no-origin'}`,
    );

    if (req.method === 'OPTIONS') {
      console.log('🔍 CORS Preflight Headers:', {
        'access-control-request-method':
          req.headers['access-control-request-method'],
        'access-control-request-headers':
          req.headers['access-control-request-headers'],
        origin: req.headers.origin,
      });
    }

    next();
  });
  app.enableCors({
    origin: [
      frontendUrl,
      'https://sdesk-frontend.vercel.app',
      'http://localhost:3000',
      'http://localhost:3001',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Cookie',
      'Set-Cookie',
      'Access-Control-Allow-Credentials',
    ],
    exposedHeaders: ['Set-Cookie'],
    credentials: true,
    preflightContinue: false, // Changed to false for proper handling of preflight requests
    optionsSuccessStatus: 204, // Some legacy browsers choke on 204
  });

  const port = process.env.PORT || 8000;
  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);
}

void bootstrap();
