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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CvService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const promises_1 = require("fs/promises");
const prisma_service_1 = require("../prisma/prisma.service");
let CvService = class CvService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async upload(user, file) {
        const cleanup = async () => {
            await (0, promises_1.unlink)(file.path).catch(() => undefined);
        };
        if (user.role !== client_1.Role.CANDIDATE) {
            await cleanup();
            throw new common_1.ForbiddenException('Solo un candidato puede subir su CV.');
        }
        const cvUrl = `/uploads/cv/${file.filename}`;
        const nameFallback = String(user.email || 'Candidato').split('@')[0] || 'Candidato';
        const candidateProfile = await this.prisma.candidateProfile
            .upsert({
            where: { userId: user.sub },
            update: { cvUrl },
            create: {
                userId: user.sub,
                name: nameFallback,
                skills: [],
                languages: [],
                cvUrl,
            },
            select: {
                id: true,
                userId: true,
                cvUrl: true,
                updatedAt: true,
            },
        })
            .catch(async (error) => {
            await cleanup();
            throw error;
        });
        return {
            cvUrl: candidateProfile.cvUrl,
            updatedAt: candidateProfile.updatedAt,
        };
    }
};
exports.CvService = CvService;
exports.CvService = CvService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CvService);
//# sourceMappingURL=cv.service.js.map