import { IsEmail, IsEnum, IsString, MinLength, IsOptional } from 'class-validator';

// Alineado con Prisma enum Role
export enum UserRoleDto {
  CANDIDATE = 'CANDIDATE',
  COMPANY = 'COMPANY',
}

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  @IsOptional()
  fullName?: string;

  @IsEnum(UserRoleDto)
  role!: UserRoleDto;
}
