/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { verify } from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers['authorization'];
    let token: string | undefined;
    console.log('[JwtAuthGuard] canActivate called', {
      authHeader,
      cookies: (request as any).cookies,
    });
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if ((request as any).cookies?.jwt) {
      token = (request as any).cookies.jwt;
      console.log('[JwtAuthGuard] Token found in cookies:', token);
    }
    if (!token) {
      throw new UnauthorizedException('No token provided');
    }
    try {
      const payload = verify(
        token,
        process.env.JWT_SECRET || 'your-secret-key',
      );
      (request as any).user = payload;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
