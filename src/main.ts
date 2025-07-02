import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { Request, Response, NextFunction } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  // Configure CORS for production and development
  const allowedOrigins = [
    'https://sdesk-frontend.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173', // Vite dev server
    'https://localhost:3000',
    'https://localhost:5173',
  ];

  console.log('🔧 CORS Configuration:');
  console.log('🌍 Environment:', process.env.NODE_ENV);
  console.log('🔗 Allowed Origins:', allowedOrigins);
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

      // Manually handle preflight for critical routes
      res.header('Access-Control-Allow-Origin', req.headers.origin);
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header(
        'Access-Control-Allow-Methods',
        'GET,POST,PUT,DELETE,OPTIONS,PATCH',
      );
      res.header(
        'Access-Control-Allow-Headers',
        'Origin,X-Requested-With,Content-Type,Accept,Authorization,Cookie,Cache-Control,Pragma',
      );
      res.status(204).send();
      return;
    }

    next();
  });

  // More robust CORS configuration
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Cookie',
      'Cache-Control',
      'Pragma',
    ],
    exposedHeaders: ['Set-Cookie'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });
  const port = process.env.PORT || 8000;
  await app.listen(port, '0.0.0.0'); // Listen on all network interfaces
  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`CORS Configuration is active`);
}
void bootstrap();
