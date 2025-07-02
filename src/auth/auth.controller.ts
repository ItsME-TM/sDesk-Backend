import { Controller, Post, Body, Res, Req, Get, Headers } from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { MicrosoftLoginDto } from './dto/microsoft-login.dto';
import { verify } from 'jsonwebtoken';
import { TeamAdminService } from '../teamadmin/teamadmin.service';
import { TechnicianService } from '../technician/technician.service';
import { User } from './interface/auth.interface';
import { UserPayload } from './interface/user-payload.interface';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly teamAdminService: TeamAdminService,
    private readonly technicianService: TechnicianService,
  ) {}

  @Post('login')
  async microsoftLogin(
    @Body() body: MicrosoftLoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{
    success: boolean;
    user?: User;
    message?: string;
    accessToken?: string;
  }> {
    try {
      const { accessToken, refreshToken, user } =
        await this.authService.handleMicrosoftLogin(
          body.code,
          body.state,
          body.redirect_uri,
        );      console.log('[AuthController] Microsoft login successful:', user);
      console.log('[AuthController] Access Token:', accessToken);
      console.log('[AuthController] Refresh Token:', refreshToken);
      
      // Always use 'none' for sameSite when using Vercel with Heroku
      // This allows cookies to be sent in cross-origin requests
      
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: true, // Always use secure cookies with sameSite=none
        sameSite: 'none', // Required for cross-origin cookies
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/', // Ensure cookie is accessible on all paths
      });
      res.cookie('jwt', accessToken, {
        httpOnly: true,
        secure: true, // Always use secure cookies with sameSite=none
        sameSite: 'none', // Required for cross-origin cookies
        maxAge: 60 * 60 * 1000,
        path: '/', // Ensure cookie is accessible on all paths
      });
      return { success: true, user, accessToken };
    } catch (error) {
      console.error('[AuthController] Login error:', error);
      return { success: false, message: 'Login failed' };
    }
  }

  @Post('logout')
  logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): {
    success: boolean;
    message: string;
  } {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (refreshToken) {
        this.authService.revokeRefreshToken(refreshToken as string);
      }      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: true, // Always use secure cookies with sameSite=none
        sameSite: 'none', // Required for cross-origin cookies
        path: '/', // Ensure cookie is accessible on all paths
      });
      res.clearCookie('jwt', {
        httpOnly: true,
        secure: true, // Always use secure cookies with sameSite=none
        sameSite: 'none', // Required for cross-origin cookies
        path: '/', // Ensure cookie is accessible on all paths
      });
      return { success: true, message: 'Logged out successfully' };
    } catch (error) {
      console.error('[AuthController] Logout error:', error);
      return { success: false, message: 'Logout failed' };
    }
  }

  @Post('refresh-token')
  async refreshToken(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: boolean; accessToken?: string; message?: string }> {
    try {
      const refreshToken = req.cookies?.refreshToken;      if (!refreshToken) {
        res.clearCookie('jwt', {
          httpOnly: true,
          secure: true, // Always use secure cookies with sameSite=none
          sameSite: 'none', // Required for cross-origin cookies
          path: '/', // Ensure cookie is accessible on all paths
        });
        console.log('[AuthController] No refresh token provided');
        return { success: false, message: 'No refresh token provided' };
      }
      const accessToken = await this.authService.refreshJwtToken(
        refreshToken as string,
      );      res.cookie('jwt', accessToken, {
        httpOnly: true,
        secure: true, // Always use secure cookies with sameSite=none
        sameSite: 'none', // Required for cross-origin cookies
        maxAge: 60 * 60 * 1000,
        path: '/', // Ensure cookie is accessible on all paths
      });
      console.log('[AuthController] New access token generated:', accessToken);
      return { success: true };
    } catch (error) {      res.clearCookie('jwt', {
        httpOnly: true,
        secure: true, // Always use secure cookies with sameSite=none
        sameSite: 'none', // Required for cross-origin cookies
        path: '/', // Ensure cookie is accessible on all paths
      });
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: true, // Always use secure cookies with sameSite=none
        sameSite: 'none', // Required for cross-origin cookies
        path: '/', // Ensure cookie is accessible on all paths
      });
      console.error('[AuthController] Refresh token error:', error);
      return { success: false, message: 'Token refresh failed' };
    }
  }

  @Get('logged-user')
  async getLoggedUser(
    @Headers('authorization') authHeader: string,
    @Req() req: Request,
  ) {
    let token: string | undefined;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies?.jwt) {
      token = req.cookies.jwt;
    }
    if (!token) {
      return { success: false, message: 'No token provided' };
    }
    try {
      const payload = verify(
        token,
        process.env.JWT_SECRET || 'your-secret-key',
      ) as UserPayload;
      console.log('[AuthController] Logged user payload:', payload);
      if (payload.role === 'admin' && payload.serviceNum) {
        console.log(
          '[AuthController] Fetching admin details for service number:',
          payload.serviceNum,
        );
        try {
          const admin =
            await this.teamAdminService.findTeamAdminByServiceNumber(
              payload.serviceNum,
            );
          if (admin) {
            console.log('Admin details:', admin);
            // Add role: 'admin' to the response object
            return { success: true, user: { ...admin, role: 'admin' } };
          } else {
            console.log(
              `[AuthController] No admin found for service number: ${payload.serviceNum}`,
            );
            // For admin role, return basic user info if admin record not found
            return {
              success: true,
              user: {
                name: payload.name,
                email: payload.email,
                serviceNum: payload.serviceNum,
                role: 'admin',
              },
            };
          }
        } catch (adminError) {
          console.error(
            '[AuthController] Error fetching admin details:',
            adminError,
          );
          return {
            success: false,
            message: 'Error fetching admin details',
          };
        }
      } else if (payload.role === 'technician' && payload.serviceNum) {
        console.log(
          '[AuthController] Fetching technician details for service number:',
          payload.serviceNum,
        );
        try {
          const technician = await this.technicianService.findOneTechnician(
            payload.serviceNum,
          );
          if (technician) {
            console.log('Technician details:', technician);
            // Add role: 'technician' to the response object
            return {
              success: true,
              user: { ...technician, role: 'technician' },
            };
          } else {
            console.log(
              `[AuthController] No technician found for service number: ${payload.serviceNum}`,
            );
            // For technician role, return basic user info if technician record not found
            return {
              success: true,
              user: {
                name: payload.name,
                email: payload.email,
                serviceNum: payload.serviceNum,
                role: 'technician',
              },
            };
          }
        } catch (technicianError) {
          console.error(
            '[AuthController] Error fetching technician details:',
            technicianError,
          );
          return {
            success: false,
            message: 'Error fetching technician details',
          };
        }
      } else if (payload.role === 'superAdmin') {
        console.log(
          '[AuthController] SuperAdmin user authenticated:',
          payload.serviceNum,
        );
        // SuperAdmin users don't need additional record lookup
        return { success: true, user: { ...payload, role: 'superAdmin' } };
      } else if (payload.role === 'teamLeader') {
        console.log(
          '[AuthController] TeamLeader user authenticated:',
          payload.serviceNum,
        );
        // TeamLeader users don't need additional record lookup
        return { success: true, user: { ...payload, role: 'teamLeader' } };
      }
      if (payload.role === 'user') {
        console.log(
          '[AuthController] Regular user authenticated:',
          payload.serviceNum,
        );
        // Add role: 'user' to the response object
        return { success: true, user: { ...payload, role: 'user' } };
      }
      console.log(
        '[AuthController] Fallback authentication for role:',
        payload.role,
      );
      return { success: true, user: payload };
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'TokenExpiredError') {
          console.error(
            '[AuthController] Get logged user error: Token expired',
          );
          return { success: false, message: 'Token expired' };
        }
        if (error.name === 'JsonWebTokenError') {
          console.error(
            '[AuthController] Get logged user error: Invalid token',
          );
          return { success: false, message: 'Invalid token' };
        }
      }
      console.error('[AuthController] Get logged user error:', error);
      return { success: false, message: 'Token verification failed' };
    }
  }
}
