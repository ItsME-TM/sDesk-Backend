import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { IncidentService } from './incident.service';
import { IncidentController } from './incident.controller';
import { Incident } from './entities/incident.entity';
import { IncidentHistory } from './entities/incident-history.entity';
import { Technician } from '../technician/entities/technician.entity';
import { TechnicianModule } from '../technician/technician.module';
import { CategoryItem } from '../Categories/Entities/Categories.entity';
import { SLTUser } from '../sltusers/entities/sltuser.entity';
import { TeamAdmin } from '../teamadmin/entities/teamadmin.entity';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      Incident,
      Technician,
      IncidentHistory,
      CategoryItem,
      SLTUser,
      TeamAdmin,
    ]),
    TechnicianModule,
  ],
  controllers: [IncidentController],
  providers: [IncidentService],
})
export class IncidentModule {}