import { IsOptional, IsString } from 'class-validator';

export class FilterCandidatesDto {
  @IsOptional()
  @IsString()
  skills?: string;

  @IsOptional()
  @IsString()
  location?: string;
}
