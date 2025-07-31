import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';

// Define the expected user data structure
interface UserData {
  serviceNum: string;
  role: string;
}

// Extend the Socket type to include custom properties
interface CustomSocket extends Socket {
  userId?: string;
  userRole?: string;
}

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
  app.use((req: Request, res: Response, next: NextFunction) => {
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

  await app.init();
  const port = Number(process.env.PORT) || 8000; // Convert to number
  httpServer.listen(port, '0.0.0.0', () => {
    // Application started successfully
  });
  io.on('connection', (socket: CustomSocket) => {
    // Store user info when they connect (for targeted notifications)
    socket.on('user_connected', (userData: UserData) => {
      // Store user data in socket for reference
      socket.userId = userData.serviceNum;
      socket.userRole = userData.role;

      // Only join user-specific room for targeted notifications
      void socket.join(`user_${userData.serviceNum}`);
    });

    socket.on('test_message', () => {
      socket.emit('test_response', { message: 'Hello back from server!' });
    });

    socket.on('disconnect', () => {
      // User disconnected
    });
  });
  // Add global socket event listener to monitor all emissions
  io.engine.on('connection_error', () => {
    // Handle connection errors silently
  });
}

// Export the socket instance so other files can use it
export { io };

void bootstrap();
