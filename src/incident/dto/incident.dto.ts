import { IsString, IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { IncidentStatus, IncidentPriority } from '../entities/incident.entity';

export class IncidentDto {
  @IsString()
  informant!: string;

  @IsString()
  location!: string;

  @IsString()
  handler!: string;

  @IsString()
  @IsOptional()
  update_by?: string;

  @IsString()
  category!: string;

  @IsString()
  @IsOptional()
  update_on?: string;

  @IsEnum(IncidentStatus)
  status!: IncidentStatus;

  @IsEnum(IncidentPriority)
  priority!: IncidentPriority;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  notify_informant?: boolean;

  @IsString()
  @IsOptional()
  urgent_notification_to?: string;

  @IsString()
  @IsOptional()
  Attachment?: string;
  
  @IsBoolean()
  @IsOptional()
  automaticallyAssignForTier2?: boolean;
}
