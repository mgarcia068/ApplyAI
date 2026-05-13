import { IsString, IsNotEmpty, IsArray, IsInt, IsOptional, IsEnum, Min } from 'class-validator';
import { Modality } from '@prisma/client';

export class CreateJobDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skillsRequired?: string[];

  @IsInt()
  @Min(0)
  @IsOptional()
  minExperience?: number;

  @IsString()
  @IsOptional()
  location?: string;

  @IsEnum(Modality)
  @IsOptional()
  modality?: Modality;
}