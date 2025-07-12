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
import { Technician } from '../technician/entities/technician.entity';
import { IncidentHistory } from './entities/incident-history.entity';
import { CategoryItem } from '../Categories/Entities/Categories.entity';

@Injectable()
export class IncidentService {
  constructor(
    @InjectRepository(Incident)
    private incidentRepository: Repository<Incident>,
    @InjectRepository(Technician)
    private technicianRepository: Repository<Technician>,
    @InjectRepository(IncidentHistory)
    private incidentHistoryRepository: Repository<IncidentHistory>,
    @InjectRepository(CategoryItem)
    private categoryItemRepository: Repository<CategoryItem>,
  ) {}

  async create(incidentDto: IncidentDto): Promise<Incident> {
    try {
      for (const field of INCIDENT_REQUIRED_FIELDS) {
        if (!incidentDto[field]) {
          throw new BadRequestException(`Missing required field: ${field}`);
        }
      }

      const sequenceResult = await this.incidentRepository.query(
        "SELECT nextval('incident_number_seq') as value",
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const nextId = sequenceResult[0]?.value;
      if (!nextId) {
        throw new BadRequestException('Failed to generate incident number');
      }
      const incidentNumber = `IN${nextId}`;

      // --- Team-based Technician Assignment Logic ---
      // Step 1: Find CategoryItem by name (incidentDto.category is the category name)
      const categoryItem = await this.categoryItemRepository.findOne({
        where: { name: incidentDto.category },
        relations: ['subCategory', 'subCategory.mainCategory'],
      });

      if (!categoryItem) {
        throw new BadRequestException(
          `Category '${incidentDto.category}' not found`,
        );
      }

      // Step 2: Get MainCategory ID (this is the team ID)
      const mainCategoryId = categoryItem.subCategory?.mainCategory?.id;
      if (!mainCategoryId) {
        throw new BadRequestException(
          `No team found for category '${incidentDto.category}'`,
        );
      }

      console.log(
        `🔍 Found team ID: ${mainCategoryId} for category: ${incidentDto.category}`,
      );
      console.log(
        `🔍 Team ID type: ${typeof mainCategoryId}, value: '${mainCategoryId}'`,
      );

      // Step 3: Get the team name from mainCategory
      const teamName = categoryItem.subCategory?.mainCategory?.name;
      console.log(`  Team name: ${teamName}`);

      // Step 4: Try to find technician by all possible combinations (deep robust search)
      let assignedTechnician: Technician | null = null;
      const levelVariants = ['Tier1', 'tier1'];
      for (const team of [mainCategoryId, teamName]) {
        for (const level of levelVariants) {
          if (!team) continue;
          assignedTechnician = await this.technicianRepository.findOne({
            where: {
              team: team,
              level: level,
              active: true,
            },
          });
          if (assignedTechnician) break;
        }
        if (assignedTechnician) break;
      }

      // Step 5: Assign the first available technician
      if (!assignedTechnician) {
        throw new BadRequestException(
          `No active tier1 technician found for team '${mainCategoryId}' (category: ${incidentDto.category})`,
        );
      }

      console.log(
        `✅ Assigning technician: ${assignedTechnician.serviceNum} (${assignedTechnician.name}) to incident: ${incidentNumber}`,
      );

      const incident = this.incidentRepository.create({
        ...incidentDto,
        incident_number: incidentNumber,
        handler: assignedTechnician.serviceNum,
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
  async getAssignedToMe(handler: string): Promise<Incident[]> {
    try {
      if (!handler) {
        throw new BadRequestException('handler is required');
      }
      return await this.incidentRepository.find({
        where: { handler: handler },
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
    console.log(
      `🔍 Incident Service: getAssignedByMe called with informant: ${informant}`,
    );

    try {
      if (!informant) {
        throw new BadRequestException('informant is required');
      }

      const trimmedInformant = informant.trim();
      console.log(
        `🔍 Incident Service: Searching for informant '${trimmedInformant}'`,
      );

      // First, clean up any existing data with whitespace issues
      await this.cleanupInformantWhitespace();

      console.log('🔍 Incident Service: About to execute database query...');

      // Use LIKE with trimmed spaces to handle potential whitespace issues
      const incidents = await this.incidentRepository
        .createQueryBuilder('incident')
        .where('TRIM(incident.informant) = :informant', {
          informant: trimmedInformant,
        })
        .getMany();

      console.log(
        `✅ Incident Service: Found ${incidents.length} incidents for informant '${trimmedInformant}'`,
      );
      console.log('✅ Incident Service: Incidents found:', incidents);

      return incidents;
    } catch (error) {
      console.error('❌ Incident Service: Error in getAssignedByMe:', error);
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
          console.log(
            `Cleaning informant: '${incident.informant}' -> '${trimmedInformant}'`,
          );
          incident.informant = trimmedInformant;
          updates.push(this.incidentRepository.save(incident));
        }
      }

      if (updates.length > 0) {
        await Promise.all(updates);
        console.log(
          `Cleaned up ${updates.length} incidents with whitespace issues`,
        );
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
  async getByCategory(category: string): Promise<Incident[]> {
    try {
      if (!category) {
        throw new BadRequestException('category is required');
      }
      return await this.incidentRepository.find({
        where: { category: category },
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

      // --- Auto-assign Tier2 technician if requested ---
      if (incidentDto.automaticallyAssignForTier2) {
        // Find CategoryItem by name (category)
        const categoryItem = await this.categoryItemRepository.findOne({
          where: { name: incidentDto.category || incident.category },
          relations: ['subCategory', 'subCategory.mainCategory'],
        });
        if (!categoryItem) {
          throw new BadRequestException(
            `Category '${incidentDto.category || incident.category}' not found`,
          );
        }
        const mainCategoryId = categoryItem.subCategory?.mainCategory?.id;
        const teamName = categoryItem.subCategory?.mainCategory?.name;
        let tier2Tech: Technician | null = null;
        const levelVariants = ['Tier2', 'tier2'];
        const candidates: Technician[] = [];
        for (const team of [mainCategoryId, teamName]) {
          for (const level of levelVariants) {
            if (!team) continue;
            const found = await this.technicianRepository.find({
              where: { team: team, level: level, active: true },
            });
            if (found && found.length > 0) {
              candidates.push(...found);
            }
          }
        }
        if (candidates.length > 0) {
          // Randomly select a technician
          tier2Tech = candidates[Math.floor(Math.random() * candidates.length)];
          incidentDto.handler = tier2Tech.serviceNum;
        } else {
          throw new BadRequestException(
            `No active Tier2 technician found for team '${mainCategoryId || teamName}' (category: ${incidentDto.category || incident.category})`,
          );
        }
      }

      // --- IncidentHistory entry ---
      const history = this.incidentHistoryRepository.create({
        incidentNumber: incident_number,
        status: incidentDto.status || incident.status,
        assignedTo: incidentDto.handler || incident.handler,
        updatedBy: incidentDto.update_by || incident.update_by,
        comments: incidentDto.description || incident.description,
        category: incidentDto.category || incident.category,
        location: incidentDto.location || incident.location,
      });
      await this.incidentHistoryRepository.save(history);
      // --- End IncidentHistory entry ---
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

  async getIncidentHistory(
    incident_number: string,
  ): Promise<IncidentHistory[]> {
    return await this.incidentHistoryRepository.find({
      where: { incidentNumber: incident_number },
      order: { updatedOn: 'ASC' },
    });
  }
}

