"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppConfig = void 0;
const common_1 = require("@nestjs/common");
let AppConfig = class AppConfig {
    appEnv = process.env.APP_ENV ?? 'development';
    port = Number(process.env.PORT ?? 8000);
    authMode = process.env.AUTH_MODE ?? 'static';
    jwtSecret = process.env.JWT_SECRET ?? 'development-secret-development-secret';
    jwtIssuer = process.env.JWT_ISSUER ?? 'qingxier';
    storageBackend = process.env.STORAGE_BACKEND ?? 'memory';
    mongoUri = process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/qingxier';
    eventBackend = process.env.EVENT_BACKEND ?? 'memory';
    mqttUrl = process.env.MQTT_URL ?? 'mqtt://127.0.0.1:1883';
    providerMode = process.env.PROVIDER_MODE ?? 'mock';
    dashscopeApiKey = process.env.DASHSCOPE_API_KEY ?? '';
    dashscopeBaseUrl = process.env.DASHSCOPE_BASE_URL ?? 'https://dashscope.aliyuncs.com';
    cloneTtsModel = process.env.CLONE_TTS_MODEL ?? 'cosyvoice-v3.5-flash';
    systemTtsModel = process.env.SYSTEM_TTS_MODEL ?? 'qwen3-tts-flash-realtime';
    llmBaseUrl = process.env.LLM_BASE_URL ?? 'https://api.deepseek.com';
    llmApiKey = process.env.LLM_API_KEY ?? '';
    llmModel = process.env.LLM_MODEL ?? 'deepseek-chat';
    cosBaseUrl = process.env.COS_BASE_URL ?? 'https://cdn.example.com';
    validate() { if (!Number.isInteger(this.port) || this.port < 1 || this.port > 65535)
        throw new Error('PORT_INVALID'); if (!['static', 'jwt'].includes(this.authMode))
        throw new Error('AUTH_MODE_INVALID'); if (this.authMode === 'jwt' && this.jwtSecret.length < 32)
        throw new Error('JWT_SECRET_TOO_SHORT'); if (!['memory', 'mongo'].includes(this.storageBackend))
        throw new Error('STORAGE_BACKEND_INVALID'); if (!['memory', 'mqtt'].includes(this.eventBackend))
        throw new Error('EVENT_BACKEND_INVALID'); if (!['mock', 'dashscope'].includes(this.providerMode))
        throw new Error('PROVIDER_MODE_INVALID'); if (this.providerMode === 'dashscope' && !this.dashscopeApiKey)
        throw new Error('DASHSCOPE_API_KEY_REQUIRED'); }
};
exports.AppConfig = AppConfig;
exports.AppConfig = AppConfig = __decorate([
    (0, common_1.Injectable)()
], AppConfig);
//# sourceMappingURL=app-config.js.map