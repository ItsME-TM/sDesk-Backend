import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Incident } from './entities/incident.entity';
import { IncidentDto } from './dto/incident.dto';
import { INCIDENT_REQUIRED_FIELDS } from './incident.interface';

@Injectable()
export class IncidentService {
  constructor(
    @InjectRepository(Incident)
    private incidentRepository: Repository<Incident>,
  ) {}

  async create(incidentDto: IncidentDto): Promise<Incident> {
    try {
      for (const field of INCIDENT_REQUIRED_FIELDS) {
        if (!incidentDto[field]) {
          throw new BadRequestException(`Missing required field: ${field}`);
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const sequenceResult = await this.incidentRepository.query(
        "SELECT nextval('incident_number_seq') as value",
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const nextId = sequenceResult[0]?.value;
      if (!nextId) {
        throw new BadRequestException('Failed to generate incident number');
      }
      const incidentNumber = `IN${nextId}`;

      const incident = this.incidentRepository.create({
        ...incidentDto,
        incident_number: incidentNumber,
      });

      return await this.incidentRepository.save(incident);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(
        'Failed to create incident: ' + message,
      );
    }
  }

  async getAssignedToMe(incidentDto: IncidentDto): Promise<Incident[]> {
    try {
      if (!incidentDto.handler) {
        throw new BadRequestException('handler is required');
      }
      return await this.incidentRepository.find({
        where: { handler: incidentDto.handler },
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(
        'Failed to retrieve incidents: ' + message,
      );
    }
  }

  async getAssignedByMe(informant: string): Promise<Incident[]> {
    try {
      if (!informant) {
        throw new BadRequestException('informant is required');
      }
      
      const trimmedInformant = informant.trim();
      console.log(`getAssignedByMe: Searching for informant '${trimmedInformant}'`);
      
      // First, clean up any existing data with whitespace issues
      await this.cleanupInformantWhitespace();
      
      // Use LIKE with trimmed spaces to handle potential whitespace issues
      const incidents = await this.incidentRepository
        .createQueryBuilder('incident')
        .where('TRIM(incident.informant) = :informant', { informant: trimmedInformant })
        .getMany();
      
      console.log(`getAssignedByMe: Found ${incidents.length} incidents for informant '${trimmedInformant}'`);
      return incidents;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(
        'Failed to retrieve incidents assigned by informant: ' + message,
      );
    }
  }

  // Helper method to clean up whitespace in informant field
  private async cleanupInformantWhitespace(): Promise<void> {
    try {
      const incidents = await this.incidentRepository.find();
      const updates: Promise<Incident>[] = [];
      
      for (const incident of incidents) {
        const trimmedInformant = incident.informant?.trim();
        if (incident.informant !== trimmedInformant) {
          console.log(`Cleaning informant: '${incident.informant}' -> '${trimmedInformant}'`);
          incident.informant = trimmedInformant;
          updates.push(this.incidentRepository.save(incident));
        }
      }
      
      if (updates.length > 0) {
        await Promise.all(updates);
        console.log(`Cleaned up ${updates.length} incidents with whitespace issues`);
      }
    } catch (error) {
      console.error('Error cleaning up informant whitespace:', error);
    }
  }

  async getAll(): Promise<Incident[]> {
    try {
      return await this.incidentRepository.find();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(
        'Failed to retrieve all incidents: ' + message,
      );
    }
  }

  async getByCategory(incidentDto: IncidentDto): Promise<Incident[]> {
    try {
      if (!incidentDto.category) {
        throw new BadRequestException('category is required');
      }
      return await this.incidentRepository.find({
        where: { category: incidentDto.category },
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(
        'Failed to retrieve incidents by category: ' + message,
      );
    }
  }

  async update(
    incident_number: string,
    incidentDto: IncidentDto,
  ): Promise<Incident> {
    try {
      const incident = await this.incidentRepository.findOne({
        where: { incident_number },
      });
      if (!incident) {
        throw new NotFoundException(
          `Incident with incident_number ${incident_number} not found`,
        );
      }
      if (Object.keys(incidentDto).length == 0) {
        throw new BadRequestException(
          'At least one field is required to update',
        );
      }
      Object.assign(incident, incidentDto);
      return await this.incidentRepository.save(incident);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(
        'Failed to update incident: ' + message,
      );
    }
  }

  async getIncidentByNumber(incident_number: string): Promise<Incident> {
    try {
      const incident = await this.incidentRepository.findOne({
        where: { incident_number },
      });
      if (!incident) {
        throw new NotFoundException(
          `Incident with incident_number ${incident_number} not found`,
        );
      }
      return incident;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(
        'Failed to retrieve incident: ' + message,
      );
    }
  }
}
