"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApplication = createApplication;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const swagger_1 = require("@nestjs/swagger");
const platform_ws_1 = require("@nestjs/platform-ws");
const app_module_1 = require("./app.module");
const app_config_1 = require("./config/app-config");
async function createApplication() { const app = await core_1.NestFactory.create(app_module_1.AppModule, { logger: false }); const c = app.get(app_config_1.AppConfig); c.validate(); app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })); app.useWebSocketAdapter(new platform_ws_1.WsAdapter(app)); app.enableCors({ origin: false, methods: ['GET', 'POST', 'PATCH', 'DELETE'] }); const cfg = new swagger_1.DocumentBuilder().setTitle('庆喜儿平台 API').setVersion('2.0.0').addBearerAuth().build(); swagger_1.SwaggerModule.setup('docs', app, swagger_1.SwaggerModule.createDocument(app, cfg)); return app; }
//# sourceMappingURL=bootstrap.js.map