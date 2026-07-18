"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const app_config_1 = require("./config/app-config");
const auth_1 = require("./common/auth");
const exception_filter_1 = require("./common/exception.filter");
const response_interceptor_1 = require("./common/response.interceptor");
const trace_middleware_1 = require("./common/trace.middleware");
const data_store_1 = require("./infrastructure/data-store");
const integrations_1 = require("./infrastructure/integrations");
const speech_service_1 = require("./application/speech.service");
const platform_service_1 = require("./application/platform.service");
const controllers_1 = require("./api/controllers");
const voice_gateway_1 = require("./api/voice.gateway");
let AppModule = class AppModule {
    configure(c) { c.apply(trace_middleware_1.TraceMiddleware).forRoutes('*'); }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({ controllers: [controllers_1.HealthController, controllers_1.UserController, controllers_1.DeviceSpeechController, controllers_1.InteractionController, controllers_1.SocialContentController, controllers_1.CommerceController, controllers_1.AdminController, controllers_1.WebhookController], providers: [app_config_1.AppConfig, auth_1.AuthService, data_store_1.dataStoreProvider, integrations_1.eventBusProvider, integrations_1.aiProvider, speech_service_1.SpeechService, platform_service_1.PlatformService, voice_gateway_1.VoiceGateway, { provide: core_1.APP_GUARD, useClass: auth_1.AuthGuard }, { provide: core_1.APP_GUARD, useClass: auth_1.RolesGuard }, { provide: core_1.APP_GUARD, useClass: auth_1.MfaGuard }, { provide: core_1.APP_INTERCEPTOR, useClass: response_interceptor_1.ResponseInterceptor }, { provide: core_1.APP_FILTER, useClass: exception_filter_1.AllExceptionsFilter }] })
], AppModule);
//# sourceMappingURL=app.module.js.map