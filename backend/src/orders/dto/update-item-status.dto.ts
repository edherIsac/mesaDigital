import { IsString, IsOptional } from 'class-validator';

export class UpdateItemStatusDto {
  @IsString()
  status: string;

  @IsString()
  @IsOptional()
  assignedTo?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  actorId?: string;
}
