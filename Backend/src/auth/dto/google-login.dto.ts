import { IsString, IsEnum, IsOptional } from 'class-validator';
import { UserRoleDto } from './register.dto';

export class GoogleLoginDto {
  @IsString()
  credential!: string;

  @IsEnum(UserRoleDto)
  @IsOptional()
  role?: UserRoleDto;
}
