"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const fs_1 = require("fs");
const path_1 = require("path");
const app_module_1 = require("./app.module");
const app_config_service_1 = require("./config/app-config.service");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const appConfig = app.get(app_config_service_1.AppConfigService);
    app.setGlobalPrefix('api');
    const uploadsPath = (0, path_1.join)(__dirname, '..', 'uploads');
    (0, fs_1.mkdirSync)(uploadsPath, { recursive: true });
    app.useStaticAssets(uploadsPath, {
        prefix: '/uploads/',
    });
    const frontendUrls = appConfig.frontendUrls;
    app.enableCors({
        origin: frontendUrls?.length ? frontendUrls : true,
        credentials: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
    }));
    await app.listen(appConfig.port);
}
bootstrap();
//# sourceMappingURL=main.js.map