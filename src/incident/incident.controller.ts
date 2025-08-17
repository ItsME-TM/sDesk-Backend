import {
  Controller,
  Post,
  Body,
  Get,
  Put,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../middlewares/jwt-auth.guard';
import { RolesGuard } from '../middlewares/roles.guard';
import { Roles } from '../middlewares/roles.decorator';
import { IncidentService } from './incident.service';
import { IncidentDto } from './dto/incident.dto';
import { Incident } from './entities/incident.entity';
import { IncidentHistory } from './entities/incident-history.entity';
import { io } from '../main';

@Controller('incident')
export class IncidentController {
  constructor(private readonly incidentService: IncidentService) {}

  // Post method
  @Post('create-incident')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user', 'admin', 'technician', 'teamLeader', 'superAdmin')
  async create(@Body() incidentDto: IncidentDto): Promise<Incident> {
    try {
      const incident = await this.incidentService.create(incidentDto);


      if (io) {
        const eventData = { incident };

        // 1. Send to ALL users for general awareness (no popup, just for Redux state update)
        io.emit('incident_created', eventData);

        // 2. Send targeted notification to assigned technician (with popup)
        if (incident.handler) {
          io.to(`user_${incident.handler}`).emit(
            'incident_assigned_technician',
            {
              ...eventData,
              message: `You have been assigned incident ${incident.incident_number}`,
            },
          );
        }

      } else {
      }

      return incident;
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

    // eslint-disable-next-line no-useless-catch
    try {
      const result = await this.incidentService.getAssignedByMe(serviceNum);


      return result;
    } catch (error) {
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

  @Get('dashboard-stats')
  async getDashboardStats(
    @Query('userParentCategory') userParentCategory?: string,
  ): Promise<any> {
    try {
      return await this.incidentService.getDashboardStats(userParentCategory);
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

    try {
      const updatedIncident = await this.incidentService.update(
        incident_number,
        incidentDto,
      );


      if (io) {

        const eventData = { incident: updatedIncident };

        // 1. Send to ALL users for general awareness (no popup, just for Redux state update)
        io.emit('incident_updated', eventData);

        // 2. Send targeted notification to assigned handler (with popup)
        if (updatedIncident.handler) {
          io.to(`user_${updatedIncident.handler}`).emit(
            'incident_updated_assigned',
            {
              ...eventData,
              message: `Incident ${updatedIncident.incident_number} has been updated`,
            },
          );
        }

      } else {
      }

      return updatedIncident;
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

  // Test endpoint for socket functionality
  @Post('test-socket')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user', 'admin', 'technician', 'teamLeader', 'superAdmin')
  testSocket(): { message: string } {

    // Create a mock incident for testing
    const mockIncident = {
      incident_number: `TEST-${Date.now()}`,
      informant: '105553',
      location: 'Test Location',
      handler: '105553',
      category: 'Socket Test',
      status: 'Open',
      priority: 'Medium',
      problem: 'Testing socket functionality',
    };


    if (io) {

      // Send all types of notifications for testing
      const eventData = { incident: mockIncident };

      // 1. General notification to all users
      io.emit('incident_created', eventData);

      // 2. Targeted notification to assigned technician (simulating assignment)
      io.to(`user_${mockIncident.handler}`).emit(
        'incident_assigned_technician',
        {
          ...eventData,
          message: `Test assignment: You have been assigned incident ${mockIncident.incident_number}`,
        },
      );
    } else {
    }

    return { message: 'Test socket events emitted successfully' };
  }

  // Test endpoint for socket update functionality
  @Post('test-socket-update')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user', 'admin', 'technician', 'teamLeader', 'superAdmin')
  testSocketUpdate(): { message: string } {

    // Create a mock updated incident for testing
    const mockUpdatedIncident = {
      incident_number: `UPDATE-TEST-${Date.now()}`,
      informant: '105553',
      location: 'Updated Test Location',
      handler: '105553',
      category: 'Socket Update Test',
      status: 'In Progress',
      priority: 'High',
      problem:
        'Testing socket update functionality - Status changed to In Progress',
    };


    if (io) {

      const eventData = { incident: mockUpdatedIncident };

      // 1. General notification to all users (no popup)
      io.emit('incident_updated', eventData);

      // 2. Targeted notification to assigned handler (with popup)
      io.to(`user_${mockUpdatedIncident.handler}`).emit(
        'incident_updated_assigned',
        {
          ...eventData,
          message: `Test update: Incident ${mockUpdatedIncident.incident_number} has been updated`,
        },
      );
    } else {
    }

    return { message: 'Test socket update events emitted successfully' };
  }
}
