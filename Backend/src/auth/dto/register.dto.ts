import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';

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

  @IsEnum(UserRoleDto)
  role!: UserRoleDto;
}
