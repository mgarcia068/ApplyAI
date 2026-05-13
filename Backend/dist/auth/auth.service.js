"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const bcrypt = require("bcryptjs");
const jwt_1 = require("@nestjs/jwt");
const app_config_service_1 = require("../config/app-config.service");
const prisma_service_1 = require("../prisma/prisma.service");
const register_dto_1 = require("./dto/register.dto");
let AuthService = AuthService_1 = class AuthService {
    constructor(prisma, jwt, appConfig) {
        this.prisma = prisma;
        this.jwt = jwt;
        this.appConfig = appConfig;
    }
    async register(dto) {
        const email = dto.email.trim().toLowerCase();
        const role = dto.role === register_dto_1.UserRoleDto.CANDIDATE ? client_1.Role.CANDIDATE : client_1.Role.COMPANY;
        const hashedPassword = await bcrypt.hash(dto.password, AuthService_1.PASSWORD_SALT_ROUNDS);
        try {
            const user = await this.prisma.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    role,
                },
                select: {
                    id: true,
                    email: true,
                    role: true,
                    createdAt: true,
                    updatedAt: true,
                },
            });
            return user;
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002') {
                throw new common_1.ConflictException('El email ya está registrado');
            }
            throw error;
        }
    }
    async login(dto) {
        const email = dto.email.trim().toLowerCase();
        const user = await this.prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                password: true,
                role: true,
            },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Credenciales inválidas');
        }
        const passwordOk = await bcrypt.compare(dto.password, user.password);
        if (!passwordOk) {
            throw new common_1.UnauthorizedException('Credenciales inválidas');
        }
        const jwtSecret = this.appConfig.jwtSecret;
        if (!jwtSecret) {
            throw new common_1.InternalServerErrorException('JWT_SECRET no está configurado en el entorno');
        }
        const payload = {
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
                role: user.role,
            },
        };
    }
};
exports.AuthService = AuthService;
AuthService.PASSWORD_SALT_ROUNDS = 10;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        app_config_service_1.AppConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map