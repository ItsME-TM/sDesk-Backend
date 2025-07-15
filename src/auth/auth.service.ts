import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { sign, decode, verify } from 'jsonwebtoken';
import { User, JwtPayload } from './interface/auth.interface';

// Define DecodedIdToken interface to match expected id_token structure
interface DecodedIdToken {
  oid?: string;
  preferred_username?: string;
  name?: string;
  [key: string]: unknown;
}
import { SLTUsersService } from '../sltusers/sltusers.service';
import { SLTUser } from '../sltusers/entities/sltuser.entity';
import { v4 as uuidv4 } from 'uuid';

const refreshTokensStore = new Map<string, string>();
interface MicrosoftTokenResponse {
  id_token?: string;
  access_token?: string;
  refresh_token?: string;
  [key: string]: any;
}

@Injectable()
export class AuthService {
  constructor(
    private configService: ConfigService,
    private readonly sltUsersService: SLTUsersService,
  ) {}

  private getStringFromDecoded(
    decoded: DecodedIdToken | null | undefined,
    key: string,
  ): string {
    if (decoded && typeof decoded === 'object' && key in decoded) {
      const value = (decoded as Record<string, unknown>)[key];
      return typeof value === 'string' ? value : '';
    }
    return '';
  }

  generateTokens(user: SLTUser) {
    const accessToken = sign(
      {
        name: user.display_name,
        email: user.email,
        role: user.role,
        serviceNum: user.serviceNum,
      },
      this.configService.get<string>('JWT_SECRET', 'your-secret-key'),
      { expiresIn: '15m' }, // Short-lived access token
    );
    const refreshToken = uuidv4();
    refreshTokensStore.set(refreshToken, user.email);
    return { accessToken, refreshToken };
  }

  async handleMicrosoftLogin(
    code: string,
    state: string,
    redirect_uri: string,
  ): Promise<{ accessToken: string; refreshToken: string; user: User }> {
    try {
      console.log('[AuthService] handleMicrosoftLogin called', {
        code,
        state,
        redirect_uri,
      });
      if (state !== '12345') {
        console.warn('[AuthService] Invalid state received:', state);
        throw new BadRequestException('Invalid state');
      }

      console.log('[AuthService] Requesting Microsoft token...');
      const tokenResponse = await axios.post<MicrosoftTokenResponse>(
        `https://login.microsoftonline.com/${this.configService.get('AZURE_TENANT_ID')}/oauth2/v2.0/token`,
        new URLSearchParams({
          client_id: this.configService.get('AZURE_CLIENT_ID') || '',
          client_secret: this.configService.get('AZURE_CLIENT_SECRET') || '',
          code,
          redirect_uri,
          grant_type: 'authorization_code',
        }).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );
      console.log('[AuthService] Received token response:', tokenResponse.data);

      const id_token: string | undefined = (
        tokenResponse.data as { id_token?: string }
      ).id_token;
      if (id_token) {
        const decodedIdToken = decode(id_token) as DecodedIdToken;
        console.log('[AuthService] Decoded id_token:', decodedIdToken);
        const azureId = this.getStringFromDecoded(decodedIdToken, 'oid');
        const email = this.getStringFromDecoded(
          decodedIdToken,
          'preferred_username',
        );
        const name = this.getStringFromDecoded(decodedIdToken, 'name');
        console.log('userPrincipalName:', email);
        let serviceNum = '';
        if (email && typeof email === 'string') {
          serviceNum = email.split('@')[0];
        }
        if (!azureId || !email) {
          throw new UnauthorizedException('Missing user info in id_token');
        }
        let user: SLTUser | null =
          await this.sltUsersService.findByAzureId(azureId);
        if (!user) {
          user = await this.sltUsersService.createUser({
            azureId,
            display_name: name,
            email,
            serviceNum,
            role: 'user',
          });
        }
        if (!user) throw new UnauthorizedException('User creation failed');
        const { accessToken, refreshToken } = this.generateTokens(user);
        console.log('User details: ', {
          id: user.id,
          email: user.email,
          name: user.display_name,
          role: user.role,
          serviceNum: user.serviceNum,
        });
        return {
          accessToken,
          refreshToken,
          user: {
            id: user.id,
            email: user.email,
            name: user.display_name,
            role: user.role,
            serviceNum: user.serviceNum,
          },
        };
      }
      throw new UnauthorizedException('No id_token received from Microsoft.');
    } catch (error) {
      console.error('[AuthService] handleMicrosoftLogin error:', error);
      if (axios.isAxiosError(error)) {
        let errorMsg: string = error.message;
        const data: unknown = error.response?.data;
        if (
          data &&
          typeof data === 'object' &&
          data !== null &&
          'error' in data &&
          typeof (data as { error?: unknown }).error === 'string'
        ) {
          errorMsg = (data as { error: string }).error;
        }
        throw new UnauthorizedException('Authentication failed: ' + errorMsg);
      }
      throw new UnauthorizedException(
        'Authentication failed: ' +
          ((error as Error).message ?? 'Unknown error'),
      );
    }
  }

  async refreshJwtToken(refreshToken: string): Promise<string> {
    try {
      if (typeof refreshToken !== 'string' || !refreshToken) {
        throw new UnauthorizedException('No refresh token provided');
      }
      const email = refreshTokensStore.get(refreshToken);
      if (!email) {
        throw new UnauthorizedException('Invalid refresh token');
      }
      const user = await this.sltUsersService.findByEmail(email);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }
      const accessToken = sign(
        {
          name: user.display_name,
          email: user.email,
          role: user.role,
          serviceNum: user.serviceNum,
        },
        this.configService.get<string>('JWT_SECRET', 'your-secret-key'),
        { expiresIn: '15m' },
      );
      console.log('[AuthService] refreshJwtToken generated access token:', {
        accessToken,
      });
      return typeof accessToken === 'string' ? accessToken : '';
    } catch (error) {
      console.error('[AuthService] refreshJwtToken error:', error);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Error refreshing token');
    }
  }

  revokeRefreshToken(refreshToken: string) {
    refreshTokensStore.delete(refreshToken);
  }

  getUserFromAccessToken(token: string): JwtPayload {
    try {
      if (typeof token !== 'string' || !token) {
        throw new UnauthorizedException('No token provided');
      }
      try {
        const payload = verify(
          token,
          this.configService.get<string>('JWT_SECRET', 'your-secret-key'),
        ) as JwtPayload;
        return payload;
      } catch (error: unknown) {
        if (
          typeof error === 'object' &&
          error !== null &&
          'name' in error &&
          typeof (error as { name: unknown }).name === 'string'
        ) {
          const errorName = (error as { name: string }).name;
          if (errorName === 'TokenExpiredError') {
            console.error(
              '[AuthService] getUserFromAccessToken error: Token expired',
            );
            throw new UnauthorizedException('Token expired');
          } else if (errorName === 'JsonWebTokenError') {
            console.error(
              '[AuthService] getUserFromAccessToken error: Invalid token',
            );
            throw new UnauthorizedException('Invalid token');
          }
        }
        console.error('[AuthService] getUserFromAccessToken error:', error);
        throw new UnauthorizedException('Token verification failed');
      }
    } catch (error) {
      console.error('[AuthService] getUserFromAccessToken error:', error);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Unexpected error');
    }
  }
}

