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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CvController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const path_1 = require("path");
const multer_1 = require("multer");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const cv_service_1 = require("./cv.service");
const CV_UPLOAD_DIR = (0, path_1.join)(__dirname, '..', '..', 'uploads', 'cv');
(0, fs_1.mkdirSync)(CV_UPLOAD_DIR, { recursive: true });
let CvController = class CvController {
    constructor(cvService) {
        this.cvService = cvService;
    }
    upload(user, files) {
        const file = files?.[0];
        if (!file) {
            throw new common_1.BadRequestException('Seleccioná un archivo PDF para subir.');
        }
        if (files.length > 1) {
            throw new common_1.BadRequestException('Solo se permite subir 1 archivo PDF.');
        }
        return this.cvService.upload(user, file);
    }
};
exports.CvController = CvController;
__decorate([
    (0, common_1.Post)('upload'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.UseInterceptors)((0, platform_express_1.AnyFilesInterceptor)({
        storage: (0, multer_1.diskStorage)({
            destination: CV_UPLOAD_DIR,
            filename: (req, file, cb) => {
                const requestUser = req.user;
                const userPart = requestUser?.sub ?? 'anon';
                const fileId = (0, crypto_1.randomUUID)();
                const extension = (0, path_1.extname)(file.originalname || '').toLowerCase();
                const safeExt = extension === '.pdf' ? '.pdf' : '.pdf';
                cb(null, `${userPart}-${fileId}${safeExt}`);
            },
        }),
        limits: {
            fileSize: 3 * 1024 * 1024,
            files: 1,
        },
        fileFilter: (_req, file, cb) => {
            const mimeOk = file.mimetype === 'application/pdf';
            const nameOk = String(file.originalname || '')
                .toLowerCase()
                .endsWith('.pdf');
            cb(null, mimeOk || nameOk);
        },
    })),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Array]),
    __metadata("design:returntype", void 0)
], CvController.prototype, "upload", null);
exports.CvController = CvController = __decorate([
    (0, common_1.Controller)('cv'),
    __metadata("design:paramtypes", [cv_service_1.CvService])
], CvController);
//# sourceMappingURL=cv.controller.js.map