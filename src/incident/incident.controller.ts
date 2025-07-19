import {
  Controller,
  Post,
  Body,
  Get,
  Put,
  Param,
  UseGuards,
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
    console.log('🔍 [IncidentController] create-incident endpoint called');
    console.log('🔍 [IncidentController] Request body:', incidentDto);
    try {
      const incident = await this.incidentService.create(incidentDto);
      console.log(
        '✅ [IncidentController] Incident created successfully:',
        incident.incident_number,
      );

      // Emit socket event to all clients when incident is created
      console.log(
        '📡 [IncidentController] Emitting socket event: incident_created',
      );
      console.log('📡 [IncidentController] Socket IO instance exists:', !!io);

      if (io) {
        console.log(
          '📡 [IncidentController] Connected clients count:',
          io.engine.clientsCount,
        ); // Send to specific audiences based on incident context
        const eventData = { incident };

        // 1. Send to ALL users for general awareness (no popup, just for Redux state update)
        io.emit('incident_created', eventData);
        console.log(
          '📡 [IncidentController] Broadcast incident_created to ALL users (for Redux update)',
        );

        // 2. Send targeted notification to assigned technician (with popup)
        if (incident.handler) {
          io.to(`user_${incident.handler}`).emit(
            'incident_assigned_technician',
            {
              ...eventData,
              message: `You have been assigned incident ${incident.incident_number}`,
            },
          );
          console.log(
            `📡 [IncidentController] Targeted incident_assigned_technician sent to: ${incident.handler}`,
          );
        }

        console.log('📡 [IncidentController] Event data:', {
          incident_number: incident.incident_number,
          handler: incident.handler,
          informant: incident.informant,
        });
      } else {
        console.log('❌ [IncidentController] Socket.IO instance not available');
      }

      return incident;
    } catch (error) {
      console.error('❌ [IncidentController] Error creating incident:', error);
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

  // Test endpoint for socket functionality
  @Post('test-socket')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user', 'admin', 'technician', 'teamLeader', 'superAdmin')
  testSocket(): { message: string } {
    console.log('🧪 [IncidentController] test-socket endpoint called');

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

    console.log(
      '📡 [IncidentController] Emitting test socket event: incident_created',
    );

    if (io) {
      console.log(
        '📡 [IncidentController] Connected clients count:',
        io.engine.clientsCount,
      );

      // Send all types of notifications for testing
      const eventData = { incident: mockIncident };

      // 1. General notification to all users
      io.emit('incident_created', eventData);
      console.log('📡 [IncidentController] Broadcast to ALL users');

      // 2. Targeted notification to assigned technician (simulating assignment)
      io.to(`user_${mockIncident.handler}`).emit(
        'incident_assigned_technician',
        {
          ...eventData,
          message: `Test assignment: You have been assigned incident ${mockIncident.incident_number}`,
        },
      );
      console.log(
        `📡 [IncidentController] Targeted incident_assigned_technician sent to: ${mockIncident.handler}`,
      );
    } else {
      console.log('❌ [IncidentController] Socket.IO instance not available');
    }

    return { message: 'Test socket events emitted successfully' };
  }
}
