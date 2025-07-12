import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  HttpException,
  HttpStatus,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { TeamAdminService } from './teamadmin.service';
import { TeamAdmin } from './entities/teamadmin.entity';
import { TeamAdminDto } from './dto/teamadmin-dto';
import { JwtAuthGuard } from '../middlewares/jwt-auth.guard';
import { RolesGuard } from '../middlewares/roles.guard';
import { Roles } from '../middlewares/roles.decorator';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class TeamAdminController {
  private readonly logger = new Logger(TeamAdminController.name);

  constructor(private readonly teamAdminService: TeamAdminService) {}

  @Post('admin/:teamId')
  @Roles('superAdmin')
  async createTeamAdmin(
    @Param('teamId') teamId: string,
    @Body() teamAdminDto: TeamAdminDto,
  ): Promise<TeamAdmin> {
    try {
      this.logger.log(
        `TeamAdminController - createTeamAdmin: Received request to create a new team admin for teamId: ${teamId}`,
      );
      return await this.teamAdminService.createTeamAdmin(teamAdminDto, teamId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `TeamAdminController - createTeamAdmin: Failed to create team admin: ${message}`,
        stack,
      );
      throw new HttpException(
        `Failed to create team admin: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('admin/:id')
  @Roles('superAdmin')
  async updateTeamAdminByTeamId(
    @Param('id') id: string,
    @Body() teamAdminDto: TeamAdminDto,
  ): Promise<TeamAdmin> {
    try {
      this.logger.log(
        `TeamAdminController - updateTeamAdminByTeamId: Attempting to update team admin with teamId: ${id}`,
      );
      return await this.teamAdminService.updateTeamAdminByTeamId(
        id,
        teamAdminDto,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `TeamAdminController - updateTeamAdminByTeamId: Failed to update team admin: ${message}`,
        stack,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to update team admin: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('admin/:id')
  @Roles('superAdmin')
  async deleteTeamAdminByTeamId(@Param('id') id: string) {
    try {
      this.logger.log(
        `TeamAdminController - deleteTeamAdminByTeamId: Attempting to delete team admin with teamId: ${id}`,
      );
      await this.teamAdminService.removeTeamAdminByTeamId(id);
      return {
        message: `Team admin with teamId ${id} successfully deleted`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `TeamAdminController - deleteTeamAdminByTeamId: Failed to delete team admin: ${message}`,
        stack,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to delete team admin: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('admins')
@Roles('superAdmin')
  async getAllTeamAdmins(): Promise<TeamAdmin[]> {
    try {
      this.logger.log(
        'TeamAdminController - getAllTeamAdmins: Received request to get all team admins',
      );
      return await this.teamAdminService.findAllTeamAdmins();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `TeamAdminController - getAllTeamAdmins: Failed to retrieve team admins: ${message}`,
        stack,
      );
      throw new HttpException(
        `Failed to retrieve team admins: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('admin/serviceNumber/:serviceNumber')
  @Roles('superAdmin','admin')
  async getTeamAdminByServiceNumber(
    @Param('serviceNumber') serviceNumber: string,
  ): Promise<TeamAdmin> {
    try {
      this.logger.log(
        `TeamAdminController - getTeamAdminByServiceNumber: Received request to get team admin by serviceNumber: ${serviceNumber}`,
      );
      const admin =
        await this.teamAdminService.findTeamAdminByServiceNumber(serviceNumber);
      if (!admin) {
        throw new HttpException(
          `Team admin with serviceNumber ${serviceNumber} not found`,
          HttpStatus.NOT_FOUND,
        );
      }
      return admin;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `TeamAdminController - getTeamAdminByServiceNumber: Failed to retrieve team admin: ${message}`,
        stack,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to retrieve team admin: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
