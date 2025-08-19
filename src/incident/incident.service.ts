/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
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
import { SLTUser } from '../sltusers/entities/sltuser.entity';
import fileType from 'file-type';

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
    @InjectRepository(SLTUser)
    private sltUserRepository: Repository<SLTUser>,
  ) {}

  // Helper method to detect file type from base64 string
  private async detectFileTypeFromBase64(
    base64String: string,
  ): Promise<string | undefined> {
    if (!base64String) return undefined;

    // Extract base64 data (remove data:image/png;base64, prefix if present)
    const base64Data = base64String.split(';base64,').pop();
    if (!base64Data) return undefined;

    const buffer = Buffer.from(base64Data, 'base64');
    const type = await fileType.fromBuffer(buffer);
     
    return type?.mime;
  }

  // Helper method to get display_name from slt_users table by serviceNum
  private async getDisplayNameByServiceNum(
    serviceNum: string,
  ): Promise<string> {
    if (!serviceNum) return serviceNum;
    try {
      const user = await this.sltUserRepository.findOne({
        where: { serviceNum: serviceNum },
      });
      return user ? user.display_name : serviceNum;
    } catch (error) {
      return serviceNum;
    }
  }

  async create(incidentDto: IncidentDto): Promise<Incident> {
    try {
      for (const field of INCIDENT_REQUIRED_FIELDS) {
        if (!incidentDto[field]) {
          throw new BadRequestException(`Missing required field: ${field}`);
        }
      }

      // --- File Type Validation ---
      if (incidentDto.Attachment) {
        const detectedMimeType = await this.detectFileTypeFromBase64(
          incidentDto.Attachment,
        );
        const allowedMimeTypes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'text/plain',
        ];

        if (!detectedMimeType || !allowedMimeTypes.includes(detectedMimeType)) {
          throw new BadRequestException(
            'Invalid attachment file type. Only images, PDFs, and common document formats are allowed.',
          );
        }
      }
      // --- End File Type Validation ---

      const sequenceResult = await this.incidentRepository.query(
        "SELECT nextval('incident_number_seq') as value",
      );
       
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

      // Step 3: Get the team name from mainCategory
      const teamName = categoryItem.subCategory?.mainCategory?.name;

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

      // Technician assignment complete

      const incident = this.incidentRepository.create({
        ...incidentDto,
        incident_number: incidentNumber,
        handler: assignedTechnician.serviceNum,
      });

      const savedIncident = await this.incidentRepository.save(incident);

      // Get display names for incident history
      const assignedToDisplayName = await this.getDisplayNameByServiceNum(
        savedIncident.handler,
      );
      const updatedByDisplayName = await this.getDisplayNameByServiceNum(
        savedIncident.informant,
      );

      // Create initial incident history entry
      const initialHistory = this.incidentHistoryRepository.create({
        incidentNumber: savedIncident.incident_number,
        status: savedIncident.status,
        assignedTo: assignedToDisplayName,
        updatedBy: updatedByDisplayName, // Assuming informant is the initial creator/reporter
        comments: incidentDto.description, // The description from the initial incident creation
        category: savedIncident.category,
        location: savedIncident.location,
      });
      await this.incidentHistoryRepository.save(initialHistory);

      return savedIncident;
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
    try {
      if (!informant) {
        throw new BadRequestException('informant is required');
      }

      const trimmedInformant = informant.trim();

      // First, clean up any existing data with whitespace issues
      await this.cleanupInformantWhitespace();

      // Use LIKE with trimmed spaces to handle potential whitespace issues
      const incidents = await this.incidentRepository
        .createQueryBuilder('incident')
        .where('TRIM(incident.informant) = :informant', {
          informant: trimmedInformant,
        })
        .getMany();

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
          incident.informant = trimmedInformant;
          updates.push(this.incidentRepository.save(incident));
        }
      }

      if (updates.length > 0) {
        await Promise.all(updates);
      }
    } catch (error) {
      // Silent fail for cleanup
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

      // Get display names for incident history
      const assignedToDisplayName = await this.getDisplayNameByServiceNum(
        incidentDto.handler || incident.handler,
      );
      const updatedByDisplayName = await this.getDisplayNameByServiceNum(
        incidentDto.update_by || incident.update_by,
      );

      // --- IncidentHistory entry ---
      const history = this.incidentHistoryRepository.create({
        incidentNumber: incident_number,
        status: incidentDto.status || incident.status,
        assignedTo: assignedToDisplayName,
        updatedBy: updatedByDisplayName,
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

  async getDashboardStats(userParentCategory?: string): Promise<any> {
    try {
      const incidents = await this.incidentRepository.find();

      const filteredIncidents = userParentCategory
        ? incidents.filter(
            (inc) => inc.category && inc.category.includes(userParentCategory),
          )
        : incidents;

      const today = new Date().toISOString().split('T')[0];

      const statusCounts = {
        Open: filteredIncidents.filter((inc) => inc.status === 'Open').length,
        Hold: filteredIncidents.filter((inc) => inc.status === 'Hold').length,
        'In Progress': filteredIncidents.filter(
          (inc) => inc.status === 'In Progress',
        ).length,
        Closed: filteredIncidents.filter((inc) => inc.status === 'Closed')
          .length,
      };

      const priorityCounts = {
        Medium: filteredIncidents.filter((inc) => inc.priority === 'Medium')
          .length,
        High: filteredIncidents.filter((inc) => inc.priority === 'High').length,
        Critical: filteredIncidents.filter((inc) => inc.priority === 'Critical')
          .length,
      };

      const todayStats = {
        'Open (Today)': filteredIncidents.filter(
          (inc) => inc.status === 'Open' && inc.update_on === today,
        ).length,
        'Closed (Today)': filteredIncidents.filter(
          (inc) => inc.status === 'Closed' && inc.update_on === today,
        ).length,
      };

      // Also include overall counts for comparison
      const overallStatusCounts = {
        Open: incidents.filter((inc) => inc.status === 'Open').length,
        Hold: incidents.filter((inc) => inc.status === 'Hold').length,
        'In Progress': incidents.filter((inc) => inc.status === 'In Progress')
          .length,
        Closed: incidents.filter((inc) => inc.status === 'Closed').length,
        'Open (Today)': incidents.filter(
          (inc) => inc.status === 'Open' && inc.update_on === today,
        ).length,
        'Closed (Today)': incidents.filter(
          (inc) => inc.status === 'Closed' && inc.update_on === today,
        ).length,
      };

      return {
        statusCounts,
        priorityCounts,
        todayStats,
        overallStatusCounts,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(
        'Failed to retrieve dashboard stats: ' + message,
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
