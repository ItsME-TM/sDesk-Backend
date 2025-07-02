import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeamAdmin } from './entities/teamadmin.entity';
import { TeamAdminDto } from './dto/teamadmin-dto';

@Injectable()
export class TeamAdminService {
  private readonly logger = new Logger(TeamAdminService.name);

  constructor(
    @InjectRepository(TeamAdmin)
    private teamAdminRepository: Repository<TeamAdmin>,
  ) {}

  async createTeamAdmin(
    teamAdminDto: TeamAdminDto,
    teamId: string,
  ): Promise<TeamAdmin> {
    try {
      // Ensure the teamId from the URL param is used
      const teamAdmin = this.teamAdminRepository.create({
        ...teamAdminDto,
        teamId,
      });
      return await this.teamAdminRepository.save(teamAdmin);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `TeamAdminService - createTeamAdmin: Failed to create team admin: ${message}`,
        stack,
      );
      throw new InternalServerErrorException(
        `Failed to create team admin: ${message}`,
      );
    }
  }

  async updateTeamAdminByTeamId(
    id: string,
    teamAdminDto: TeamAdminDto,
  ): Promise<TeamAdmin> {
    try {
      const teamAdmin = await this.findTeamAdminByTeamId(id);
      if (!teamAdmin) {
        throw new NotFoundException(`Team admin with teamId ${id} not found`);
      }
      Object.assign(teamAdmin, teamAdminDto);
      return await this.teamAdminRepository.save(teamAdmin);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `TeamAdminService - updateTeamAdminByTeamId: Failed to update team admin with teamId ${id}: ${message}`,
        stack,
      );
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to update team admin with teamId ${id}: ${message}`,
      );
    }
  }

  async removeTeamAdminByTeamId(id: string): Promise<void> {
    try {
      const teamAdmin = await this.findTeamAdminByTeamId(id);
      if (!teamAdmin) {
        throw new NotFoundException(`Team admin with teamId ${id} not found`);
      }
      const result = await this.teamAdminRepository.delete({ teamId: id });
      if (result.affected === 0) {
        throw new InternalServerErrorException(
          `Failed to delete team admin with teamId ${id}`,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `TeamAdminService - removeTeamAdminByTeamId: Error removing team admin with teamId ${id}: ${message}`,
        stack,
      );
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to delete team admin: ${message}`,
      );
    }
  }

  async findAllTeamAdmins(): Promise<TeamAdmin[]> {
    try {
      return await this.teamAdminRepository.find();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `TeamAdminService - findAllTeamAdmins: Failed to retrieve all team admins: ${message}`,
        stack,
      );
      throw new InternalServerErrorException(
        `Failed to retrieve team admins: ${message}`,
      );
    }
  }

  async findTeamAdminByTeamId(teamId: string): Promise<TeamAdmin | null> {
    try {
      return await this.teamAdminRepository.findOne({ where: { teamId } });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `TeamAdminService - findTeamAdminByTeamId: Failed to find team admin by teamId ${teamId}: ${message}`,
        stack,
      );
      throw new InternalServerErrorException(
        `Failed to find team admin by teamId ${teamId}: ${message}`,
      );
    }
  }

  async findTeamAdminByServiceNumber(
    serviceNumber: string,
  ): Promise<TeamAdmin | null> {
    try {
      return await this.teamAdminRepository.findOne({
        where: { serviceNumber },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `TeamAdminService - findTeamAdminByServiceNumber: Failed to find team admin by serviceNumber ${serviceNumber}: ${message}`,
        stack,
      );
      throw new InternalServerErrorException(
        `Failed to find team admin by serviceNumber ${serviceNumber}: ${message}`,
      );
    }
  }
}
