import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TeamAdminModule } from './teamadmin/teamadmin.module';
import { TeamAdmin } from './teamadmin/entities/teamadmin.entity';
import * as dotenv from 'dotenv';
import { IncidentModule } from './incident/incident.module';
import { Incident } from './incident/entities/incident.entity';
import { CategoryModule } from './Categories/Categories.module';
import { IncidentHistory } from './incident/entities/incident-history.entity';
import {
  MainCategory,
  SubCategory,
  CategoryItem,
} from './Categories/Entities/Categories.entity';
import { AuthModule } from './auth/auth.module';
import { SLTUser } from './sltusers/entities/sltuser.entity';
import { SLTUsersModule } from './sltusers/sltusers.module';
import { Team } from './team/entities/team.entity';
import { Technician } from './technician/entities/technician.entity';
import { Location } from './location/entities/location.entity';
import { TechnicianModule } from './technician/technician.module';
import { LocationModule } from './location/location.module';


dotenv.config();

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      entities: [
        TeamAdmin,
        Incident,
        MainCategory,
        SubCategory,
        CategoryItem,
        SLTUser,
        Team,
        Technician,
        Location,
         IncidentHistory,
      ],
      synchronize: true,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    }),
    IncidentModule,
    TeamAdminModule,
    CategoryModule,
    AuthModule,
    SLTUsersModule,
    TechnicianModule,
    LocationModule,

  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}