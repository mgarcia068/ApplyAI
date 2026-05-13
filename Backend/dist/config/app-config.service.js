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
exports.AppConfigService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let AppConfigService = class AppConfigService {
    constructor(config) {
        this.config = config;
    }
    getOptional(key) {
        const value = this.config.get(key);
        const trimmed = value?.trim();
        return trimmed ? trimmed : undefined;
    }
    get port() {
        const value = this.getOptional('PORT');
        const parsed = value ? Number(value) : 3000;
        return Number.isFinite(parsed) ? parsed : 3000;
    }
    get frontendUrls() {
        const value = this.getOptional('FRONTEND_URL');
        if (!value)
            return undefined;
        const urls = value
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
        return urls.length ? urls : undefined;
    }
    get databaseUrl() {
        return this.getOptional('DATABASE_URL');
    }
    get jwtSecret() {
        return this.getOptional('JWT_SECRET');
    }
    get jwtExpiresIn() {
        return this.getOptional('JWT_EXPIRES_IN') ?? '7d';
    }
    get anthropicApiKey() {
        return this.getOptional('ANTHROPIC_API_KEY');
    }
};
exports.AppConfigService = AppConfigService;
exports.AppConfigService = AppConfigService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AppConfigService);
//# sourceMappingURL=app-config.service.js.map