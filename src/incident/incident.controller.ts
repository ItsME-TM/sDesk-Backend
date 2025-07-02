import { Controller, Post, Body, Get, Query, Put, Param } from '@nestjs/common';
import { IncidentService } from './incident.service';
import { IncidentDto } from './dto/incident.dto';
import { Incident } from './entities/incident.entity';

@Controller('incident')
export class IncidentController {
  constructor(private readonly incidentService: IncidentService) {}

  @Post('create-incident')
  async create(@Body() incidentDto: IncidentDto): Promise<Incident> {
    // eslint-disable-next-line no-useless-catch
    try {
      return await this.incidentService.create(incidentDto);
    } catch (error) {
      throw error;
    }
  }

  @Get('assigned-to-me')
  async getAssignedToMe(
    @Query() incidentDto: IncidentDto,
  ): Promise<Incident[]> {
    // eslint-disable-next-line no-useless-catch
    try {
      return await this.incidentService.getAssignedToMe(incidentDto);
    } catch (error) {
      throw error;
    }
  }

  @Get('assigned-by-me')
  async getAssignedByMe(
    @Query('informant') informant: string,
  ): Promise<Incident[]> {
    // eslint-disable-next-line no-useless-catch
    try {
      return await this.incidentService.getAssignedByMe(informant);
    } catch (error) {
      throw error;
    }
  }

  @Get('all-teams')
  async getAll(): Promise<Incident[]> {
    // eslint-disable-next-line no-useless-catch
    try {
      return await this.incidentService.getAll();
    } catch (error) {
      throw error;
    }
  }

  @Get('view-team-incidents')
  async getByCategory(@Query() incidentDto: IncidentDto): Promise<Incident[]> {
    // eslint-disable-next-line no-useless-catch
    try {
      return await this.incidentService.getByCategory(incidentDto);
    } catch (error) {
      throw error;
    }
  }

  @Put(':incident_number')
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
}
