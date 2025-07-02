import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  HttpException,
  HttpStatus,
  Res,
  Req,
} from '@nestjs/common';
import { TechnicianService } from './technician.service';
import { CreateTechnicianDto } from './dto/create-technician.dto';
import { Technician } from './entities/technician.entity';
import { AuthService } from '../auth/auth.service';
import { Response, Request } from 'express';

@Controller()
export class TechnicianController {
  constructor(
    private readonly technicianService: TechnicianService,
    private readonly authService: AuthService,
  ) {}

 
  @Post('technician')
  async add(
    @Body() dto: CreateTechnicianDto,
    @Res() res: Response,
    @Req() req: Request,
  ): Promise<any> {
    const accessToken = req.cookies?.jwt;
    console.log('[POST /technician] Access Token from cookie:', accessToken);

    let isActive = false;
    let shouldClearCookies = false;

    if (accessToken) {
      try {
        const user = this.authService.getUserFromAccessToken(accessToken);
        if (user && user.role === 'technician') {
          isActive = true;
        } else {
          shouldClearCookies = true;
        }
      } catch {
        shouldClearCookies = true;
      }
    } else {
      shouldClearCookies = true;
    }

    dto.active = isActive;
    const technician = await this.technicianService.createTechnician(dto);

    if (shouldClearCookies) {
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');
    }

    return res.json(technician);
  }

@Get('technician/check-status')
  async checkTechnicianStatus(
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const token = req.cookies?.jwt;
    console.log('[GET /technician/check-status] Token:', token);

    if (!token) {
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json({ message: 'No token provided. Please login.' });
    }

    try {
      const user = this.authService.getUserFromAccessToken(token);
      if (!user || user.role !== 'technician') {
        return res.status(HttpStatus.FORBIDDEN).json({ message: 'Access denied.' });
      }

      const technician = await this.technicianService.findOneTechnician(user.serviceNum);

      if (!technician.active) {
        res.clearCookie('jwt');
        res.clearCookie('refreshToken');
        return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Deactivated. You have been logged out.' });
      }

      return res.status(HttpStatus.OK).json({ message: 'You are active.', user: technician });
    } catch (err) {
      console.error('[Check Technician Status] Error:', err);
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json({ message: 'Invalid or expired token.' });
    }
  }
  @Get('technicians')
  async findAllTechnicians(): Promise<Technician[]> {
    try {
      return await this.technicianService.findAllTechncians();
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch technicians.',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }


@Get('technician/active')
async getActiveTechnicians(): Promise<Technician[]> {
  try {
    return await this.technicianService.findActiveTechnicians();
  } catch (error) {
    throw new HttpException(
      error.message || 'Failed to fetch active technicians.',
      error.status || HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

  @Get('technician/:serviceNum')
  async findOneTechnician(
    @Param('serviceNum') serviceNum: string,
  ): Promise<Technician> {
    try {
      return await this.technicianService.findOneTechnician(serviceNum);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch technician.',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

   @Put('technician/:serviceNum')
  async updateTechnician(
    @Param('serviceNum') serviceNum: string,
    @Body() dto: CreateTechnicianDto,
  ): Promise<Technician> {
    try {
      return await this.technicianService.updateTechnician(serviceNum, dto);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to update technician.',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  

  @Delete('technician/:serviceNum')
  async deleteTechnician(
    @Param('serviceNum') serviceNum: string,
  ): Promise<{ message: string }> {
    try {
      await this.technicianService.deleteTechnician(serviceNum);
      return { message: 'Technician deleted successfully.' };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to delete technician.',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  @Put('technician/:serviceNum/deactivate')
async deactivateTechnician(@Param('serviceNum') serviceNum: string) {
  await this.technicianService.updateTechnicianActive(serviceNum, false);
  return { message: 'Technician deactivated' };
}





}
