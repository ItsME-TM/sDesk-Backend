import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  Get,
  Headers,
  Options,
} from '@nestjs/common';
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
        );
      console.log('[AuthController] Microsoft login successful:', user);
      console.log('[AuthController] Access Token:', accessToken);
      console.log('[AuthController] Refresh Token:', refreshToken);
      
      const isProduction = process.env.NODE_ENV === 'production';
      
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: isProduction, // HTTPS required in production
        sameSite: isProduction ? 'none' : 'strict', // Allow cross-origin in production
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      res.cookie('jwt', accessToken, {
        httpOnly: true,
        secure: isProduction, // HTTPS required in production
        sameSite: isProduction ? 'none' : 'strict', // Allow cross-origin in production
        maxAge: 60 * 60 * 1000,
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
      }
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: false, // set to true in production
        sameSite: 'strict',
      });
      res.clearCookie('jwt', {
        httpOnly: true,
        secure: false, // set to true in production
        sameSite: 'strict',
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
      const refreshToken = req.cookies?.refreshToken;
      if (!refreshToken) {
        res.clearCookie('jwt', {
          httpOnly: true,
          secure: false, // set to true in production
          sameSite: 'strict',
        });
        console.log('[AuthController] No refresh token provided');
        return { success: false, message: 'No refresh token provided' };
      }
      const accessToken = await this.authService.refreshJwtToken(
        refreshToken as string,
      );
      res.cookie('jwt', accessToken, {
        httpOnly: true,
        secure: false, // set to true in production (requires HTTPS)
        sameSite: 'strict',
        maxAge: 60 * 60 * 1000,
      });
      console.log('[AuthController] New access token generated:', accessToken);
      return { success: true };
    } catch (error) {
      res.clearCookie('jwt', {
        httpOnly: true,
        secure: false, // set to true in production
        sameSite: 'strict',
      });
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: false, // set to true in production
        sameSite: 'strict',
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
        const admin = await this.teamAdminService.findTeamAdminByServiceNumber(
          payload.serviceNum,
        );
        if (admin) {
          console.log('Admin details:', admin);
          // Add role: 'admin' to the response object
          return { success: true, user: { ...admin, role: 'admin' } };
        } else {
          return {
            success: false,
            message: 'Admin not found for this service number',
          };
        }
      } else if (payload.role === 'technician' && payload.serviceNum) {
        const technician = await this.technicianService.findOneTechnician(
          payload.serviceNum,
        );
        if (technician) {
          console.log('Technician details:', technician);
          // Add role: 'technician' to the response object
          return { success: true, user: { ...technician, role: 'technician' } };
        } else {
          return {
            success: false,
            message: 'Technician not found for this service number',
          };
        }
      }
      if (payload.role === 'user') {
        // Add role: 'user' to the response object
        return { success: true, user: { ...payload, role: 'user' } };
      }
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

  @Options('/*')
  handleOptions() {
    // Handle CORS preflight requests
    return { success: true };
  }
  @Options('login')
  handleLoginOptions(@Res() res: Response): void {
    res.header(
      'Access-Control-Allow-Origin',
      'https://sdesk-frontend.vercel.app',
    );
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie',
    );
    res.header('Access-Control-Allow-Credentials', 'true');
    res.status(204).send();
  }
}
