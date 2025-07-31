import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SLTUsersModule } from '../sltusers/sltusers.module';
import { TeamAdminModule } from '../teamadmin/teamadmin.module';
import { TechnicianModule } from '../technician/technician.module';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    ConfigModule,
    SLTUsersModule,
    TeamAdminModule,
    forwardRef(() => TechnicianModule),
    WebsocketModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
