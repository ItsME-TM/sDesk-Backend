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
import { TeamAdmin } from '../teamadmin/entities/teamadmin.entity';

@Injectable()
export class IncidentService {
  // Round-robin assignment tracking for each team
  private teamAssignmentIndex: Map<string, number> = new Map();

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
    @InjectRepository(TeamAdmin)
    private teamAdminRepository: Repository<TeamAdmin>,
  ) {}

  // Helper method to get display_name from slt_users table by serviceNum
  private async getDisplayNameByServiceNum(serviceNum: string): Promise<string> {
    if (!serviceNum) return serviceNum;
    try {
      const user = await this.sltUserRepository.findOne({
        where: { serviceNum: serviceNum }
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

      // Step 3: Get the team name from mainCategory
      const teamName = categoryItem.subCategory?.mainCategory?.name;

      // Step 4: Get all active tier1 technicians for the team using round-robin assignment
      let assignedTechnician: Technician | null = null;
      const levelVariants = ['Tier1', 'tier1'];
      const teamIdentifiers = [mainCategoryId, teamName].filter(Boolean);
      
      for (const team of teamIdentifiers) {
        for (const level of levelVariants) {
          // Find all active tier1 technicians for this team
          const availableTechnicians = await this.technicianRepository.find({
            where: {
              team: team,
              level: level,
              active: true,
            },
            order: {
              id: 'ASC', // Consistent ordering for round-robin
            },
          });

          if (availableTechnicians.length > 0) {
            // Implement round-robin assignment
            const teamKey = `${team}_${level}`;
            const currentIndex = this.teamAssignmentIndex.get(teamKey) || 0;
            
            // Select the technician at current index
            assignedTechnician = availableTechnicians[currentIndex];
            
            // Update index for next assignment (wrap around to 0 if at end)
            const nextIndex = (currentIndex + 1) % availableTechnicians.length;
            this.teamAssignmentIndex.set(teamKey, nextIndex);
            
            break;
          }
        }
        if (assignedTechnician) break;
      }

      // Step 5: Assign the selected technician
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
      const assignedToDisplayName = await this.getDisplayNameByServiceNum(savedIncident.handler);
      const updatedByDisplayName = await this.getDisplayNameByServiceNum(savedIncident.informant);

      // Create initial incident history entry
      const initialHistory = new IncidentHistory();
      initialHistory.incidentNumber = savedIncident.incident_number;
      initialHistory.status = savedIncident.status;
      initialHistory.assignedTo = assignedToDisplayName;
      initialHistory.updatedBy = updatedByDisplayName;
      initialHistory.comments = incidentDto.description || '';
      initialHistory.category = savedIncident.category;
      initialHistory.location = savedIncident.location;
      initialHistory.attachment = incidentDto.attachmentFilename || '';
      initialHistory.attachmentOriginalName = incidentDto.attachmentOriginalName || '';
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
        console.log('🔍 Starting Tier2 assignment process...');
        
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
        
        console.log(`📋 Category: ${incidentDto.category || incident.category}`);
        console.log(`🏢 Team ID: ${mainCategoryId}, Team Name: ${teamName}`);
        
        let tier2Tech: Technician | null = null;
        const levelVariants = ['Tier2', 'tier2'];
        const candidates: Technician[] = [];
        
        // Search by different combinations of team identifiers
        const teamIdentifiers = [
          mainCategoryId?.toString(), // Convert to string
          mainCategoryId, // Keep as number
          teamName,
          teamName?.toString(),
        ].filter(Boolean); // Remove null/undefined values
        
        console.log(`🔍 Searching for Tier2 technicians with team identifiers: ${JSON.stringify(teamIdentifiers)}`);
        
        for (const team of teamIdentifiers) {
          for (const level of levelVariants) {
            if (!team) continue;
            
            console.log(`🔍 Searching: team=${team}, level=${level}`);
            
            // Try matching both team and teamId fields
            const foundByTeam = await this.technicianRepository.find({
              where: { team: team, level: level, active: true },
            });
            
            const foundByTeamId = await this.technicianRepository.find({
              where: { teamId: team, level: level, active: true },
            });
            
            console.log(`🔍 Found by team field: ${foundByTeam.length}, Found by teamId field: ${foundByTeamId.length}`);
            
            // Combine results and remove duplicates
            const allFound = [...foundByTeam, ...foundByTeamId];
            const uniqueFound = allFound.filter((tech, index, self) => 
              index === self.findIndex(t => t.serviceNum === tech.serviceNum)
            );
            
            if (uniqueFound.length > 0) {
              console.log(`✅ Found ${uniqueFound.length} technicians: ${uniqueFound.map(t => t.serviceNum).join(', ')}`);
              candidates.push(...uniqueFound);
            }
          }
        }
        
        // Remove duplicates from final candidates array
        const uniqueCandidates = candidates.filter((tech, index, self) => 
          index === self.findIndex(t => t.serviceNum === tech.serviceNum)
        );
        
        console.log(`🎯 Total unique candidates: ${uniqueCandidates.length}`);
        
        if (uniqueCandidates.length > 0) {
          // Randomly select a technician
          tier2Tech = uniqueCandidates[Math.floor(Math.random() * uniqueCandidates.length)];
          incidentDto.handler = tier2Tech.serviceNum;
          console.log(`✅ Assigned to Tier2 technician: ${tier2Tech.serviceNum} (${tier2Tech.name})`);
        } else {
          // Let's also check what technicians exist for debugging
          const allTier2Techs = await this.technicianRepository.find({
            where: { level: 'Tier2', active: true },
          });
          console.log(`🔍 All active Tier2 technicians in database: ${allTier2Techs.map(t => `${t.serviceNum} (team: ${t.team}, teamId: ${t.teamId})`).join(', ')}`);
          
          throw new BadRequestException(
            `No active Tier2 technician found for team '${mainCategoryId || teamName}' (category: ${incidentDto.category || incident.category}). Available Tier2 technicians: ${allTier2Techs.map(t => `${t.serviceNum} (team: ${t.team})`).join(', ')}`,
          );
        }
      }

      // --- Auto-assign Team Admin if requested ---
      if (incidentDto.assignForTeamAdmin) {
        console.log('🔍 Starting Team Admin assignment process...');
        
        // Find the current technician to get their team information
        const currentTechnician = await this.technicianRepository.findOne({
          where: { serviceNum: incident.handler, active: true },
        });

        if (!currentTechnician) {
          throw new BadRequestException(
            `Current technician with serviceNum ${incident.handler} not found or not active`,
          );
        }

        console.log(`👤 Current technician: ${currentTechnician.serviceNum} (team: ${currentTechnician.team}, teamId: ${currentTechnician.teamId})`);

        // Find team admin for the technician's team using both team and teamId fields
        const teamIdentifiers = [
          currentTechnician.team,
          currentTechnician.teamId,
        ].filter(Boolean);

        console.log(`🔍 Searching for team admin with team identifiers: ${JSON.stringify(teamIdentifiers)}`);

        let teamAdmin: TeamAdmin | null = null;

        for (const teamIdentifier of teamIdentifiers) {
          console.log(`🔍 Searching for team admin with identifier: ${teamIdentifier}`);
          
          teamAdmin = await this.teamAdminRepository.findOne({
            where: [
              { teamId: teamIdentifier, active: true },
              { teamName: teamIdentifier, active: true },
            ],
          });

          if (teamAdmin) {
            console.log(`✅ Found team admin: ${teamAdmin.serviceNumber} (${teamAdmin.userName})`);
            break;
          }
        }

        if (!teamAdmin) {
          // Let's also check what team admins exist for debugging
          const allTeamAdmins = await this.teamAdminRepository.find({
            where: { active: true },
          });
          console.log(`🔍 All active team admins in database: ${allTeamAdmins.map(ta => `${ta.serviceNumber} (teamId: ${ta.teamId}, teamName: ${ta.teamName})`).join(', ')}`);
          
          throw new BadRequestException(
            `No active team admin found for technician's team (${teamIdentifiers.join(', ')}). Available team admins: ${allTeamAdmins.map(ta => `${ta.serviceNumber} (team: ${ta.teamName})`).join(', ')}`,
          );
        }

        // Assign the incident to the team admin
        incidentDto.handler = teamAdmin.serviceNumber;
        console.log(`✅ Assigned incident to team admin: ${teamAdmin.serviceNumber} (${teamAdmin.userName})`);
      }

      // Get display names for incident history
      const assignedToDisplayName = await this.getDisplayNameByServiceNum(incidentDto.handler || incident.handler);
      const updatedByDisplayName = await this.getDisplayNameByServiceNum(incidentDto.update_by || incident.update_by);

      // --- IncidentHistory entry ---
      const history = new IncidentHistory();
      history.incidentNumber = incident_number;
      history.status = incidentDto.status || incident.status;
      history.assignedTo = assignedToDisplayName;
      history.updatedBy = updatedByDisplayName;
      history.comments = incidentDto.description || incident.description || '';
      history.category = incidentDto.category || incident.category;
      history.location = incidentDto.location || incident.location;
      history.attachment = incidentDto.attachmentFilename || '';
      history.attachmentOriginalName = incidentDto.attachmentOriginalName || '';
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
        ? incidents.filter(inc => inc.category && inc.category.includes(userParentCategory))
        : incidents;

      const today = new Date().toISOString().split('T')[0];

      const statusCounts = {
        'Open': filteredIncidents.filter(inc => inc.status === 'Open').length,
        'Hold': filteredIncidents.filter(inc => inc.status === 'Hold').length,
        'In Progress': filteredIncidents.filter(inc => inc.status === 'In Progress').length,
        'Closed': filteredIncidents.filter(inc => inc.status === 'Closed').length,
      };

      const priorityCounts = {
        'Medium': filteredIncidents.filter(inc => inc.priority === 'Medium').length,
        'High': filteredIncidents.filter(inc => inc.priority === 'High').length,
        'Critical': filteredIncidents.filter(inc => inc.priority === 'Critical').length,
      };

      const todayStats = {
        'Open (Today)': filteredIncidents.filter(inc => inc.status === 'Open' && inc.update_on === today).length,
        'Closed (Today)': filteredIncidents.filter(inc => inc.status === 'Closed' && inc.update_on === today).length,
      };

      // Also include overall counts for comparison
      const overallStatusCounts = {
        'Open': incidents.filter(inc => inc.status === 'Open').length,
        'Hold': incidents.filter(inc => inc.status === 'Hold').length,
        'In Progress': incidents.filter(inc => inc.status === 'In Progress').length,
        'Closed': incidents.filter(inc => inc.status === 'Closed').length,
        'Open (Today)': incidents.filter(inc => inc.status === 'Open' && inc.update_on === today).length,
        'Closed (Today)': incidents.filter(inc => inc.status === 'Closed' && inc.update_on === today).length,
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