import { Controller, Post, Body, Get, Put, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../middlewares/jwt-auth.guard';
import { RolesGuard } from '../middlewares/roles.guard';
import { Roles } from '../middlewares/roles.decorator';
import { IncidentService } from './incident.service';
import { IncidentDto } from './dto/incident.dto';
import { Incident } from './entities/incident.entity';
import { IncidentHistory } from './entities/incident-history.entity';

@Controller('incident')
export class IncidentController {
  constructor(private readonly incidentService: IncidentService) {}
//post method
  @Post('create-incident')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user', 'admin', 'technician', 'teamLeader', 'superAdmin')
  async create(@Body() incidentDto: IncidentDto): Promise<Incident> {
    // eslint-disable-next-line no-useless-catch
    try {
      return await this.incidentService.create(incidentDto);
    } catch (error) {
      throw error; 
    }
  }
  @Get('assigned-to-me/:serviceNum')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user', 'admin', 'technician', 'teamLeader', 'superAdmin')
  async getAssignedToMe(
    @Param('serviceNum') serviceNum: string,
  ): Promise<Incident[]> {
    // eslint-disable-next-line no-useless-catch
    try {
      return await this.incidentService.getAssignedToMe(serviceNum);
    } catch (error) {
      throw error;
    }
  }
  @Get('assigned-by-me/:serviceNum')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user', 'admin', 'technician', 'teamLeader', 'superAdmin')
  async getAssignedByMe(
    @Param('serviceNum') serviceNum: string,
  ): Promise<Incident[]> {
    console.log(
      '🔍 Incident Controller: getAssignedByMe called with serviceNum:',
      serviceNum,
    );
    console.log(
      '🔍 Incident Controller: Request timestamp:',
      new Date().toISOString(),
    );

    // eslint-disable-next-line no-useless-catch
    try {
      console.log(
        '🔍 Incident Controller: About to call service.getAssignedByMe...',
      );
      const result = await this.incidentService.getAssignedByMe(serviceNum);

      console.log('✅ Incident Controller: Service returned result:', result);
      console.log(
        '✅ Incident Controller: Number of incidents found:',
        result?.length || 0,
      );

      return result;
    } catch (error) {
      console.error('❌ Incident Controller: Error in getAssignedByMe:', error);
      throw error;
    }
  }

  @Get('all-teams')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user', 'admin', 'technician', 'teamLeader', 'superAdmin')
  async getAll(): Promise<Incident[]> {
    // eslint-disable-next-line no-useless-catch
    try {
      return await this.incidentService.getAll();
    } catch (error) {
      throw error;
    }
  }
  @Get('view-team-incidents/:teamId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user', 'admin', 'technician', 'teamLeader', 'superAdmin')
  async getByCategory(@Param('teamId') teamId: string): Promise<Incident[]> {
    // eslint-disable-next-line no-useless-catch
    try {
      return await this.incidentService.getByCategory(teamId);
    } catch (error) {
      throw error;
    }
  }

  @Put(':incident_number')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user', 'admin', 'technician', 'teamLeader', 'superAdmin')
  async update(
    @Param('incident_number') incident_number: string,
    @Body() incidentDto: IncidentDto,
  ): Promise<Incident> {
    // eslint-disable-next-line no-useless-catch
    try {
      return await this.incidentService.update(incident_number, incidentDto);
    } catch (error) {
      throw error;
    }
  }

  @Get(':incident_number')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user', 'admin', 'technician', 'teamLeader', 'superAdmin')
  async getIncidentByNumber(
    @Param('incident_number') incident_number: string,
  ): Promise<Incident> {
    // eslint-disable-next-line no-useless-catch
    try {
      return await this.incidentService.getIncidentByNumber(incident_number);
    } catch (error) {
      throw error;
    }
  }

  @Get(':incident_number/history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user', 'admin', 'technician', 'teamLeader', 'superAdmin')
  async getIncidentHistory(
    @Param('incident_number') incident_number: string,
  ): Promise<IncidentHistory[]> {
    // eslint-disable-next-line no-useless-catch
    try {
      return await this.incidentService.getIncidentHistory(incident_number);
    } catch (error) {
      throw error;
    }
  }
}