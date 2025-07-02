// update-technician.dto.ts
import {
  IsString,
  IsBoolean,
  IsNumber,
  IsEmail,
  IsOptional,
  IsNotEmpty,
  IsIn
} from 'class-validator';

export class CreateTechnicianDto {
 
  @IsString()
  @IsNotEmpty()
  serviceNum: string;


  @IsString()
  @IsNotEmpty()
  name: string;


  @IsString()
  @IsNotEmpty()
  team: string;

  
  @IsString()
  @IsNotEmpty()
  cat1: string;

  @IsOptional()
  @IsString()
  cat2?: string;

  @IsOptional()
  @IsString()
  cat3?: string;

  @IsOptional()
  @IsString()
  cat4?: string;


  @IsNumber()
  rr: number;


  @IsBoolean()
  active: boolean;

  @IsIn([1, 2])
tier: number;
  @IsString()
  level: string;


  @IsString()
  teamLevel: string;

  
  @IsString()
  designation: string;


  @IsEmail()
  email: string;


  @IsString()
  contactNumber: string;

 
  @IsBoolean()
  teamLeader: boolean;


  @IsBoolean()
  assignAfterSignOff: boolean;


  @IsBoolean()
  permanentMember: boolean;


  @IsBoolean()
  subrootUser: boolean;
}