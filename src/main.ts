import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Global socket instance (we'll improve this architecture later)
let io: Server;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  const allowedOrigins = [
    'https://sdesk-frontend.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173',
    'https://localhost:3000',
    'https://localhost:5173',
  ];

  console.log('🔧 CORS Configuration:');
  console.log('🌍 Environment:', process.env.NODE_ENV);
  console.log('🔗 Allowed Origins:', allowedOrigins);

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
    origin: true,
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
  const httpServer = createServer(app.getHttpAdapter().getInstance());
  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST'],
    },
  });

  console.log('🔧 Socket.IO server initialized');

  await app.init();

  const port = Number(process.env.PORT) || 8000; // Convert to number
  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`Application is running on: http://localhost:${port}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`CORS Configuration is active`);
    console.log(`Socket.IO server is running`);
  });

  io.on('connection', (socket) => {
    console.log('✅ [SOCKET] Client connected:', socket.id);
    console.log('📊 [SOCKET] Total connected clients:', io.engine.clientsCount);

    // Store user info when they connect (for targeted notifications)
    socket.on('user_connected', (userData: any) => {
      console.log('👤 [SOCKET] User authenticated:', userData);

      // Store user data in socket for reference
      (socket as any).userId = userData.serviceNum;
      (socket as any).userRole = userData.role;

      // Only join user-specific room for targeted notifications
      void socket.join(`user_${userData.serviceNum}`);

      console.log(
        `👤 [SOCKET] User ${userData.serviceNum} (${userData.role}) joined room: user_${userData.serviceNum}`,
      );
    });

    socket.on('test_message', (data) => {
      console.log('📨 [SOCKET] Received test message:', data);
      socket.emit('test_response', { message: 'Hello back from server!' });
      console.log('📤 [SOCKET] Sent test response to client:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('❌ [SOCKET] Client disconnected:', socket.id);
      if ((socket as any).userId) {
        console.log(`👤 [SOCKET] User ${(socket as any).userId} disconnected`);
      }
      console.log(
        '📊 [SOCKET] Remaining connected clients:',
        io.engine.clientsCount,
      );
    });
  });

  // Add global socket event listener to monitor all emissions
  io.engine.on('connection_error', (err) => {
    console.log('🚨 [SOCKET] Connection error:', err.req);
    console.log('🚨 [SOCKET] Error code:', err.code);
    console.log('🚨 [SOCKET] Error message:', err.message);
    console.log('🚨 [SOCKET] Error context:', err.context);
  });
}

// Export the socket instance so other files can use it
export { io };

void bootstrap();
