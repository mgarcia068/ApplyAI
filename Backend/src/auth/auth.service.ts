import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';

import { AppConfigService } from '../config/app-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto, UserRoleDto } from './dto/register.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { JwtPayload } from './types/jwt-payload.type';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class AuthService {
  private static readonly PASSWORD_SALT_ROUNDS = 10;
  private readonly googleClient: OAuth2Client;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly appConfig: AppConfigService,
  ) {
    this.googleClient = new OAuth2Client(this.appConfig.googleClientId || 'default-client-id');
  }

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();

    const role: Role =
      dto.role === UserRoleDto.CANDIDATE ? Role.CANDIDATE : Role.COMPANY;

    const hashedPassword = await bcrypt.hash(
      dto.password,
      AuthService.PASSWORD_SALT_ROUNDS,
    );

    try {
      const user = await this.prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          fullName: dto.fullName,
          role,
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return user;
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('El email ya está registrado');
      }
      throw error;
    }
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        fullName: true,
        role: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordOk = await bcrypt.compare(dto.password, user.password);
    if (!passwordOk) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const jwtSecret = this.appConfig.jwtSecret;
    if (!jwtSecret) {
      throw new InternalServerErrorException(
        'JWT_SECRET no está configurado en el entorno',
      );
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: jwtSecret,
      expiresIn: this.appConfig.jwtExpiresIn,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }

  async googleLogin(dto: GoogleLoginDto) {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: dto.credential,
        audience: this.appConfig.googleClientId || 'default-client-id',
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new UnauthorizedException('Google Token inválido');
      }

      const email = payload.email.toLowerCase();
      let isNewUser = false;
      let user = await this.prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, fullName: true, role: true }
      });

      if (!user) {
        if (!dto.role) {
          throw new UnauthorizedException('Se requiere el rol para el registro con Google');
        }
        
        const role: Role = dto.role === UserRoleDto.CANDIDATE ? Role.CANDIDATE : Role.COMPANY;
        const generatedPassword = await bcrypt.hash(Math.random().toString(36).slice(-8), AuthService.PASSWORD_SALT_ROUNDS);
        
        user = await this.prisma.user.create({
          data: {
            email,
            password: generatedPassword,
            fullName: payload.name || payload.given_name || email.split('@')[0],
            role,
          },
          select: { id: true, email: true, fullName: true, role: true }
        });
        isNewUser = true;
      }

      const jwtSecret = this.appConfig.jwtSecret;
      if (!jwtSecret) {
        throw new InternalServerErrorException('JWT_SECRET no está configurado en el entorno');
      }

      const jwtPayload: JwtPayload = {
        sub: user.id,
        email: user.email,
        role: user.role,
      };

      const accessToken = await this.jwt.signAsync(jwtPayload, {
        secret: jwtSecret,
        expiresIn: this.appConfig.jwtExpiresIn,
      });

      return {
        accessToken,
        user,
        isNewUser,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Error autenticando con Google');
    }
  }
}
