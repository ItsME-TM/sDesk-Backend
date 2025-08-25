import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Incident, IncidentStatus } from './entities/incident.entity';
import { IncidentDto } from './dto/incident.dto';
import { INCIDENT_REQUIRED_FIELDS } from './incident.interface';
import { Technician } from '../technician/entities/technician.entity';
import { IncidentHistory } from './entities/incident-history.entity';
import { CategoryItem } from '../Categories/Entities/Categories.entity';
import { SLTUser } from '../sltusers/entities/sltuser.entity';
import { TeamAdmin } from '../teamadmin/entities/teamadmin.entity';

@Injectable()
export class IncidentService {
  private readonly logger = new Logger(IncidentService.name);
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

      // Step 5: Check for a technician and create the incident
      let incident: Incident;
      if (assignedTechnician) {
        // If a technician is found, assign them
        incident = this.incidentRepository.create({
          ...incidentDto,
          incident_number: incidentNumber,
          handler: assignedTechnician.serviceNum,
          status: IncidentStatus.OPEN, // Explicitly set status to OPEN
        });
      } else {
        // If no technician is found, create the incident as PENDING_ASSIGNMENT
       
        incident = this.incidentRepository.create({
          ...incidentDto,
          incident_number: incidentNumber,
          handler: null, // No handler assigned
          status: IncidentStatus.PENDING_ASSIGNMENT, // Set status to PENDING
        });
      }

      const savedIncident = await this.incidentRepository.save(incident);

      // Get display names for incident history
      const assignedToDisplayName = savedIncident.handler
        ? await this.getDisplayNameByServiceNum(savedIncident.handler)
        : 'Pending Assignment';
      const updatedByDisplayName = await this.getDisplayNameByServiceNum(
        savedIncident.informant,
      );

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

      // --- Get Original Incident to check for category change ---
      const originalIncident = await this.incidentRepository.findOne({
        where: { incident_number },
      });

      if (!originalIncident) {
        throw new NotFoundException(`Incident with incident_number ${incident_number} not found`);
      }

      const categoryChanged = incidentDto.category && incidentDto.category !== originalIncident.category;

      if (categoryChanged) {
       
        // Find CategoryItem by name (incidentDto.category is the category name)
        const categoryItem = await this.categoryItemRepository.findOne({
          where: { name: incidentDto.category },
          relations: ['subCategory', 'subCategory.mainCategory'],
        });

        if (!categoryItem) {
          console.error(`[IncidentService] New category '${incidentDto.category}' not found for reassignment.`);
          throw new BadRequestException(
            `New category '${incidentDto.category}' not found for reassignment.`,
          );
        }

        const mainCategoryId = categoryItem.subCategory?.mainCategory?.id;
        const teamName = categoryItem.subCategory?.mainCategory?.name;

        if (!mainCategoryId && !teamName) {
          console.error(`[IncidentService] No team found for new category '${incidentDto.category}' for reassignment.`);
          throw new BadRequestException(
            `No team found for new category '${incidentDto.category}' for reassignment.`,
          );
        }

        let assignedTechnician: Technician | null = null;
        const levelVariants = ['Tier1', 'tier1'];
        const teamIdentifiers = [mainCategoryId, teamName].filter(Boolean);

        console.log(`[IncidentService] Searching for Tier1 technicians in teams: ${teamIdentifiers.join(', ')}`);

        for (const team of teamIdentifiers) {
          for (const level of levelVariants) {
            const availableTechnicians = await this.technicianRepository.find({
              where: {
                team: team,
                level: level,
                active: true,
              },
              order: {
                id: 'ASC',
              },
            });

            if (availableTechnicians.length > 0) {
              const teamKey = `${team}_${level}`;
              const currentIndex = this.teamAssignmentIndex.get(teamKey) || 0;
              assignedTechnician = availableTechnicians[currentIndex];
              const nextIndex = (currentIndex + 1) % availableTechnicians.length;
              this.teamAssignmentIndex.set(teamKey, nextIndex);
              console.log(`[IncidentService] Found and assigned Tier1 technician: ${assignedTechnician.serviceNum} from team ${team}`);
              break;
            }
          }
          if (assignedTechnician) break;
        }

        if (!assignedTechnician) {
          console.error(`[IncidentService] No active Tier1 technician found for team associated with new category '${incidentDto.category}'.`);
          throw new BadRequestException(
            `No active Tier1 technician found for team associated with new category '${incidentDto.category}'.`,
          );
        }

        // Assign the incident to the newly found Tier1 technician
        incidentDto.handler = assignedTechnician.serviceNum;
        console.log(`[IncidentService] Incident ${incident_number} reassigned to Tier1 technician: ${assignedTechnician.serviceNum}`);

        // Clear other assignment flags if category changed and new assignment made
        incidentDto.automaticallyAssignForTier2 = false;
        incidentDto.assignForTeamAdmin = false;
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
        
       
        
        for (const team of teamIdentifiers) {
          for (const level of levelVariants) {
            if (!team) continue;
            
           
            
            // Try matching both team and teamId fields
            const foundByTeam = await this.technicianRepository.find({
              where: { team: team, level: level, active: true },
            });
            
            const foundByTeamId = await this.technicianRepository.find({
              where: { teamId: team, level: level, active: true },
            });
            
           
            
            // Combine results and remove duplicates
            const allFound = [...foundByTeam, ...foundByTeamId];
            const uniqueFound = allFound.filter((tech, index, self) => 
              index === self.findIndex(t => t.serviceNum === tech.serviceNum)
            );
            
            if (uniqueFound.length > 0) {
              
              candidates.push(...uniqueFound);
            }
          }
        }
        
        // Remove duplicates from final candidates array
        const uniqueCandidates = candidates.filter((tech, index, self) => 
          index === self.findIndex(t => t.serviceNum === tech.serviceNum)
        );
        
    
        
        if (uniqueCandidates.length > 0) {
          // Randomly select a technician
          tier2Tech = uniqueCandidates[Math.floor(Math.random() * uniqueCandidates.length)];
          incidentDto.handler = tier2Tech.serviceNum;
          
        } else {
          // Let's also check what technicians exist for debugging
          const allTier2Techs = await this.technicianRepository.find({
            where: { level: 'Tier2', active: true },
          });
         
          
          throw new BadRequestException(
            `No active Tier2 technician found for team '${mainCategoryId || teamName}' (category: ${incidentDto.category || incident.category}). Available Tier2 technicians: ${allTier2Techs.map(t => `${t.serviceNum} (team: ${t.team})`).join(', ')}`,
          );
        }
      }

      // --- Auto-assign Team Admin if requested ---
      if (incidentDto.assignForTeamAdmin) {
        

        const currentHandler = incident.handler;
        if (!currentHandler) {
          throw new BadRequestException(
            'Cannot assign to a team admin because the incident has no current handler.',
          );
        }

        // Find the current technician to get their team information
        const currentTechnician = await this.technicianRepository.findOne({
          where: { serviceNum: currentHandler, active: true },
        });

        if (!currentTechnician) {
          throw new BadRequestException(
            `Current technician with serviceNum ${incident.handler} not found or not active`,
          );
        }

        

        // Find team admin for the technician's team using both team and teamId fields
        const teamIdentifiers = [
          currentTechnician.team,
          currentTechnician.teamId,
        ].filter(Boolean);

      

        let teamAdmin: TeamAdmin | null = null;

        for (const teamIdentifier of teamIdentifiers) {
         
          
          teamAdmin = await this.teamAdminRepository.findOne({
            where: [
              { teamId: teamIdentifier, active: true },
              { teamName: teamIdentifier, active: true },
            ],
          });

          if (teamAdmin) {
       
            break;
          }
        }

        if (!teamAdmin) {
          // Let's also check what team admins exist for debugging
          const allTeamAdmins = await this.teamAdminRepository.find({
            where: { active: true },
          });
        
          
          throw new BadRequestException(
            `No active team admin found for technician's team (${teamIdentifiers.join(', ')}). Available team admins: ${allTeamAdmins.map(ta => `${ta.serviceNumber} (team: ${ta.teamName})`).join(', ')}`,
          );
        }

        // Assign the incident to the team admin
        incidentDto.handler = teamAdmin.serviceNumber;
 
      }

      // Get display names for incident history
      const handlerIdentifier = incidentDto.handler || incident.handler;
      const assignedToDisplayName = handlerIdentifier
        ? await this.getDisplayNameByServiceNum(handlerIdentifier)
        : 'N/A';
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
      console.error(`[IncidentService] Error updating incident ${incident_number}:`, error);
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

  async getDashboardStats(params?: {
    userType?: string;
    technicianId?: string;
    teamName?: string;
    adminServiceNum?: string;
  }): Promise<any> {
    try {
      const incidents = await this.incidentRepository.find();

      const { userType, technicianId, adminServiceNum } = params || {};

      let filteredIncidents = incidents;

      // Handle technician filtering - show only incidents assigned to this technician
      if (userType?.toLowerCase() === 'technician' && technicianId) {
        filteredIncidents = incidents.filter(incident => 
          incident.handler === technicianId
        );
      }
      // Handle admin filtering based on main category and subcategories
      else if (userType?.toLowerCase() === 'admin' && adminServiceNum) {
       
        
        // Get admin's assigned categories
        const teamAdmin = await this.teamAdminRepository.findOne({
          where: { serviceNumber: adminServiceNum },
        });

       

        if (teamAdmin) {
          // Get all category items that belong to admin's main category (teamName) or subcategories (cat1-cat4)
          const adminCategories = [teamAdmin.teamName, teamAdmin.cat1, teamAdmin.cat2, teamAdmin.cat3, teamAdmin.cat4]
            .filter(cat => cat && cat.trim() !== '');

          

          // Get all category items that fall under these categories
          const categoryItems = await this.categoryItemRepository
            .createQueryBuilder('categoryItem')
            .leftJoinAndSelect('categoryItem.subCategory', 'subCategory')
            .leftJoinAndSelect('subCategory.mainCategory', 'mainCategory')
            .where(
              'mainCategory.name IN (:...mainCategories) OR subCategory.name IN (:...subCategories)',
              {
                mainCategories: adminCategories,
                subCategories: adminCategories,
              }
            )
            .getMany();

        
          // Get both category codes and names for filtering
          const categoryItemCodes = categoryItems.map(item => item.category_code);
          const categoryItemNames = categoryItems.map(item => item.name);

         

          // Filter incidents by category items (check both code and name fields)
          filteredIncidents = incidents.filter(incident => 
            incident.category && (
              categoryItemCodes.includes(incident.category) ||
              categoryItemNames.includes(incident.category)
            )
          );

         
        }
      }

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

  // ------------------- SCHEDULER FOR PENDING ASSIGNMENTS ------------------- //

  @Cron(CronExpression.EVERY_30_SECONDS)
  async handlePendingAssignments(): Promise<number> {
    this.logger.log('Running scheduled task to assign pending incidents...');

    const pendingIncidents = await this.incidentRepository.find({
      where: { status: IncidentStatus.PENDING_ASSIGNMENT },
    });

    if (pendingIncidents.length === 0) {
      this.logger.log('No pending incidents to assign.');
      return 0;
    }

    this.logger.log(`Found ${pendingIncidents.length} pending incidents.`);
    let assignmentsCount = 0;

    for (const incident of pendingIncidents) {
      try {
        const assigned = await this.assignPendingIncident(incident);
        if (assigned) {
          assignmentsCount++;
        }
      } catch (error) {
        this.logger.error(
          `Failed to process incident ${incident.incident_number}: ${error.message}`,
          error.stack,
        );
      }
    }

    this.logger.log(
      `Completed assignment task. Assigned ${assignmentsCount} incidents.`,
    );
    return assignmentsCount;
  }

  private async assignPendingIncident(incident: Incident): Promise<boolean> {
    const categoryItem = await this.categoryItemRepository.findOne({
      where: { name: incident.category },
      relations: ['subCategory', 'subCategory.mainCategory'],
    });

    if (!categoryItem?.subCategory?.mainCategory) {
      this.logger.warn(
        `Could not find team for category '${incident.category}' on incident ${incident.incident_number}. Skipping.`,
      );
      return false;
    }

    const teamId = categoryItem.subCategory.mainCategory.id;
    const teamName = categoryItem.subCategory.mainCategory.name;

    const availableTechnicians = await this.technicianRepository.find({
      where: {
        team: In([teamId, teamName]),
        level: In(['Tier1', 'tier1']),
        active: true,
      },
      order: { id: 'ASC' },
    });

    if (availableTechnicians.length === 0) {
      this.logger.log(
        `No active Tier1 technicians found for team '${teamName}' (ID: ${teamId}) for incident ${incident.incident_number}.`,
      );
      return false;
    }

    const teamKey = `${teamId}_Tier1`;
    const currentIndex = this.teamAssignmentIndex.get(teamKey) || 0;
    const assignedTechnician = availableTechnicians[currentIndex];
    const nextIndex = (currentIndex + 1) % availableTechnicians.length;
    this.teamAssignmentIndex.set(teamKey, nextIndex);

    incident.handler = assignedTechnician.serviceNum;
    incident.status = IncidentStatus.OPEN;
    await this.incidentRepository.save(incident);

    const assignedToDisplayName = await this.getDisplayNameByServiceNum(
      incident.handler,
    );
    const updatedByDisplayName = 'System';

    const history = new IncidentHistory();
    history.incidentNumber = incident.incident_number;
    history.status = incident.status;
    history.assignedTo = assignedToDisplayName;
    history.updatedBy = updatedByDisplayName;
    history.comments = 'Incident automatically assigned by the system.';
    history.category = incident.category;
    history.location = incident.location;
    await this.incidentHistoryRepository.save(history);

    this.logger.log(
      `Successfully assigned incident ${incident.incident_number} to technician ${assignedTechnician.serviceNum}.`,
    );

    return true;
  }
}
