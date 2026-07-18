"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookController = exports.AdminController = exports.CommerceController = exports.SocialContentController = exports.InteractionController = exports.DeviceSpeechController = exports.UserController = exports.HealthController = void 0;
const common_1 = require("@nestjs/common");
const auth_1 = require("../common/auth");
const platform_service_1 = require("../application/platform.service");
const speech_service_1 = require("../application/speech.service");
const D = __importStar(require("./dto"));
let HealthController = class HealthController {
    platform;
    constructor(platform) {
        this.platform = platform;
    }
    health() { return this.platform.health(); }
    async ready() { const x = await this.platform.ready(); if (x.status !== 'ready')
        throw new common_1.ServiceUnavailableException('服务尚未就绪'); return x; }
};
exports.HealthController = HealthController;
__decorate([
    (0, auth_1.Public)(),
    (0, common_1.Get)('/health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HealthController.prototype, "health", null);
__decorate([
    (0, auth_1.Public)(),
    (0, common_1.Get)('/ready'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "ready", null);
exports.HealthController = HealthController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [platform_service_1.PlatformService])
], HealthController);
let UserController = class UserController {
    p;
    constructor(p) {
        this.p = p;
    }
    login(b) { return this.p.login(b); }
    refresh(b) { return this.p.refresh(b); }
    phone(q, b) { return this.p.bindPhone(q, b); }
    me(q) { return this.p.me(q); }
    update(q, b) { return this.p.updateMe(q, b); }
    export(q) { return this.p.exportMe(q); }
    remove(q) { return this.p.deleteMe(q); }
    addresses(q) { return this.p.addresses(q); }
    addAddress(q, b) { return this.p.addAddress(q, b); }
    patchAddress(q, id, b) { return this.p.patchAddress(q, id, b); }
    deleteAddress(q, id) { return this.p.deleteAddress(q, id); }
};
exports.UserController = UserController;
__decorate([
    (0, auth_1.Public)(),
    (0, common_1.Post)('auth/wechat-login'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [D.WechatLoginDto]),
    __metadata("design:returntype", void 0)
], UserController.prototype, "login", null);
__decorate([
    (0, auth_1.Public)(),
    (0, common_1.Post)('auth/refresh'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [D.RefreshDto]),
    __metadata("design:returntype", void 0)
], UserController.prototype, "refresh", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Post)('auth/phone-bind'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, D.PhoneBindDto]),
    __metadata("design:returntype", void 0)
], UserController.prototype, "phone", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Get)('users/me'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UserController.prototype, "me", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Patch)('users/me'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, D.UpdateUserDto]),
    __metadata("design:returntype", void 0)
], UserController.prototype, "update", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Get)('users/me/export'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UserController.prototype, "export", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Delete)('users/me'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UserController.prototype, "remove", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Get)('users/me/addresses'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UserController.prototype, "addresses", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Post)('users/me/addresses'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, D.AddressDto]),
    __metadata("design:returntype", void 0)
], UserController.prototype, "addAddress", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Patch)('users/me/addresses/:id'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, D.AddressDto]),
    __metadata("design:returntype", void 0)
], UserController.prototype, "patchAddress", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Delete)('users/me/addresses/:id'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], UserController.prototype, "deleteAddress", null);
exports.UserController = UserController = __decorate([
    (0, common_1.Controller)('/api/v1'),
    __metadata("design:paramtypes", [platform_service_1.PlatformService])
], UserController);
let DeviceSpeechController = class DeviceSpeechController {
    p;
    s;
    constructor(p, s) {
        this.p = p;
        this.s = s;
    }
    bindTicket(q, b) { return this.p.bindTicket(q, b); }
    bind(q, b) { return this.p.bindDevice(q, b); }
    devices(q) { return this.p.devices(q); }
    status(q, id) { return this.p.deviceStatus(q, id); }
    update(q, id, b) { return this.p.updateDevice(q, id, b); }
    unbind(q, id) { return this.p.unbind(q, id); }
    command(q, id, b, r) { return this.p.command(q, id, b, r.traceId ?? ''); }
    capabilities() { return this.s.capabilities(); }
    profile(q, id) { return this.s.profile(q, id); }
    patchProfile(q, id, b, r) { return this.s.updateProfile(q, id, b, r.traceId ?? ''); }
    wake(q, id) { return this.s.wakeStatus(q, id); }
    session(q, b) { return this.s.createSession(q, b); }
    route(q, b) { return this.s.route(q, b); }
    tts(q, b, r) { return this.s.tts(q, b, r.traceId ?? ''); }
    ota(q, id, v) { return this.p.otaCheck(q, id, v); }
    report(q, b) { return this.p.otaReport(q, b); }
    wakePackages() { return this.s.wakePackages(); }
    wakePackage(q, b, key, r) { return this.s.registerWake(q, b, key, r.traceId ?? ''); }
};
exports.DeviceSpeechController = DeviceSpeechController;
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Post)('devices/bind-ticket'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, D.BindTicketDto]),
    __metadata("design:returntype", void 0)
], DeviceSpeechController.prototype, "bindTicket", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Post)('devices/bind'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, D.BindDeviceDto]),
    __metadata("design:returntype", void 0)
], DeviceSpeechController.prototype, "bind", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Get)('devices'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DeviceSpeechController.prototype, "devices", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Get)('devices/:id/status'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], DeviceSpeechController.prototype, "status", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Patch)('devices/:id'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, D.UpdateDeviceDto]),
    __metadata("design:returntype", void 0)
], DeviceSpeechController.prototype, "update", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Delete)('devices/:id/binding'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], DeviceSpeechController.prototype, "unbind", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Post)('devices/:id/commands'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, D.DeviceCommandDto, Object]),
    __metadata("design:returntype", void 0)
], DeviceSpeechController.prototype, "command", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Get)('speech/capabilities'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DeviceSpeechController.prototype, "capabilities", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Get)('devices/:id/speech-profile'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], DeviceSpeechController.prototype, "profile", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Patch)('devices/:id/speech-profile'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, D.SpeechProfileUpdateDto, Object]),
    __metadata("design:returntype", void 0)
], DeviceSpeechController.prototype, "patchProfile", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Get)('devices/:id/wake-word/status'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], DeviceSpeechController.prototype, "wake", null);
__decorate([
    (0, auth_1.Roles)('device'),
    (0, common_1.Post)('speech/sessions'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, D.SpeechSessionDto]),
    __metadata("design:returntype", void 0)
], DeviceSpeechController.prototype, "session", null);
__decorate([
    (0, auth_1.Roles)('device'),
    (0, common_1.Post)('speech/route'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, D.DialectRouteDto]),
    __metadata("design:returntype", void 0)
], DeviceSpeechController.prototype, "route", null);
__decorate([
    (0, auth_1.Roles)('device'),
    (0, common_1.Post)('speech/tts'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, D.TtsDto, Object]),
    __metadata("design:returntype", void 0)
], DeviceSpeechController.prototype, "tts", null);
__decorate([
    (0, auth_1.Roles)('user', 'device'),
    (0, common_1.Get)('devices/:id/ota/check'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Query)('currentFirmware')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], DeviceSpeechController.prototype, "ota", null);
__decorate([
    (0, auth_1.Roles)('device'),
    (0, common_1.Post)('device/ota/report'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, D.OtaReportDto]),
    __metadata("design:returntype", void 0)
], DeviceSpeechController.prototype, "report", null);
__decorate([
    (0, auth_1.Roles)('admin'),
    (0, common_1.Get)('admin/wake-word-packages'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DeviceSpeechController.prototype, "wakePackages", null);
__decorate([
    (0, auth_1.Roles)('admin'),
    (0, auth_1.RequireMfa)(),
    (0, common_1.Post)('admin/wake-word-packages'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)('idempotency-key')),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, D.WakeWordPackageDto, Object, Object]),
    __metadata("design:returntype", void 0)
], DeviceSpeechController.prototype, "wakePackage", null);
exports.DeviceSpeechController = DeviceSpeechController = __decorate([
    (0, common_1.Controller)('/api/v1'),
    __metadata("design:paramtypes", [platform_service_1.PlatformService, speech_service_1.SpeechService])
], DeviceSpeechController);
let InteractionController = class InteractionController {
    p;
    s;
    constructor(p, s) {
        this.p = p;
        this.s = s;
    }
    dialog(q, b, r) { return this.s.dialog(q, b, r.traceId ?? ''); }
    dialogs(q, d) { return this.s.dialogs(q, d); }
    turns(q, id) { return this.s.turns(q, id); }
    mood(q) { return this.p.mood(q); }
    reminders(q) { return this.p.reminders(q); }
    addReminder(q, b) { return this.p.addReminder(q, b); }
    patchReminder(q, id, b) { return this.p.patchReminder(q, id, b); }
    deleteReminder(q, id) { return this.p.deleteReminder(q, id); }
    confirmReminder(q, id, b) { return this.p.confirmReminder(q, id, b); }
    reminderEvents(q, id) { return this.p.reminderEvents(q, id); }
};
exports.InteractionController = InteractionController;
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Post)('dialogs/text'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, D.DialogTextDto, Object]),
    __metadata("design:returntype", void 0)
], InteractionController.prototype, "dialog", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Get)('dialogs'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __param(1, (0, common_1.Query)('deviceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], InteractionController.prototype, "dialogs", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Get)('dialogs/:id/turns'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], InteractionController.prototype, "turns", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Get)('mood-reports/weekly'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InteractionController.prototype, "mood", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Get)('reminders'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InteractionController.prototype, "reminders", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Post)('reminders'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, D.ReminderDto]),
    __metadata("design:returntype", void 0)
], InteractionController.prototype, "addReminder", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Patch)('reminders/:id'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, D.ReminderPatchDto]),
    __metadata("design:returntype", void 0)
], InteractionController.prototype, "patchReminder", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Delete)('reminders/:id'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], InteractionController.prototype, "deleteReminder", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Post)('reminders/:id/confirm'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, D.ConfirmReminderDto]),
    __metadata("design:returntype", void 0)
], InteractionController.prototype, "confirmReminder", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Get)('reminders/:id/events'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], InteractionController.prototype, "reminderEvents", null);
exports.InteractionController = InteractionController = __decorate([
    (0, common_1.Controller)('/api/v1'),
    __metadata("design:paramtypes", [platform_service_1.PlatformService, speech_service_1.SpeechService])
], InteractionController);
let SocialContentController = class SocialContentController {
    p;
    constructor(p) {
        this.p = p;
    }
    invitations(q) { return this.p.invitations(q); }
    invite(q, b) { return this.p.invite(q, b); }
    accept(q, id, b) { return this.p.decideInvitation(q, id, true, b); }
    reject(q, id, b) { return this.p.decideInvitation(q, id, false, b); }
    relations(q) { return this.p.relations(q); }
    deleteRelation(q, id) { return this.p.deleteRelation(q, id); }
    messages(q) { return this.p.messages(q); }
    message(q, b) { return this.p.sendMessage(q, b); }
    read(q, id) { return this.p.readMessage(q, id); }
    categories() { return this.p.categories(); }
    content(c) { return this.p.kidsContent(c); }
    qas(q) { return this.p.qas(q); }
    addQa(q, b) { return this.p.addQa(q, b); }
    patchQa(q, id, b) { return this.p.patchQa(q, id, b); }
    deleteQa(q, id) { return this.p.deleteQa(q, id); }
    upload(q) { return this.p.uploadToken(q, 'custom-content'); }
    custom(q) { return this.p.customContents(q); }
    addCustom(q, b) { return this.p.addCustomContent(q, b); }
    deleteCustom(q, id) { return this.p.deleteCustomContent(q, id); }
    parent(q, id) { return this.p.parentControl(q, id); }
    patchParent(q, id, b, r) { return this.p.updateParentControl(q, id, b, r.traceId ?? ''); }
    records(q, id) { return this.p.parentRecords(q, id); }
    sleep(q, id, r) { return this.p.sleepMode(q, id, r.traceId ?? ''); }
    personas() { return this.p.personas(); }
    personaVoice(q, persona, b) { return this.p.setPersonaVoice(q, persona, b); }
    voiceUpload(q) { return this.p.uploadToken(q, 'voice-clone'); }
    voices(q) { return this.p.voiceClones(q); }
    addVoice(q, b) { return this.p.addVoiceClone(q, b); }
    voice(q, id) { return this.p.voiceClone(q, id); }
    deleteVoice(q, id) { return this.p.deleteVoiceClone(q, id); }
};
exports.SocialContentController = SocialContentController;
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Get)('relations/invitations'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SocialContentController.prototype, "invitations", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Post)('relations/invitations'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, D.InvitationDto]),
    __metadata("design:returntype", void 0)
], SocialContentController.prototype, "invite", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Post)('relations/invitations/:id/accept'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, D.InvitationDecisionDto]),
    __metadata("design:returntype", void 0)
], SocialContentController.prototype, "accept", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Post)('relations/invitations/:id/reject'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, D.InvitationDecisionDto]),
    __metadata("design:returntype", void 0)
], SocialContentController.prototype, "reject", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Get)('relations'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SocialContentController.prototype, "relations", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Delete)('relations/:id'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SocialContentController.prototype, "deleteRelation", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Get)('messages'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SocialContentController.prototype, "messages", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Post)('messages'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, D.MessageDto]),
    __metadata("design:returntype", void 0)
], SocialContentController.prototype, "message", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Post)('messages/:id/read'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SocialContentController.prototype, "read", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Get)('kids/content/categories'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SocialContentController.prototype, "categories", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Get)('kids/content'),
    __param(0, (0, common_1.Query)('category')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SocialContentController.prototype, "content", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Get)('custom-qas'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SocialContentController.prototype, "qas", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Post)('custom-qas'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, D.CustomQaDto]),
    __metadata("design:returntype", void 0)
], SocialContentController.prototype, "addQa", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Patch)('custom-qas/:id'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, D.CustomQaDto]),
    __metadata("design:returntype", void 0)
], SocialContentController.prototype, "patchQa", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Delete)('custom-qas/:id'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SocialContentController.prototype, "deleteQa", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Post)('custom-contents/upload-token'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SocialContentController.prototype, "upload", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Get)('custom-contents'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SocialContentController.prototype, "custom", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Post)('custom-contents'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, D.CustomContentDto]),
    __metadata("design:returntype", void 0)
], SocialContentController.prototype, "addCustom", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Delete)('custom-contents/:id'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SocialContentController.prototype, "deleteCustom", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Get)('parent-controls/:id'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SocialContentController.prototype, "parent", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Patch)('parent-controls/:id'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, D.ParentControlDto, Object]),
    __metadata("design:returntype", void 0)
], SocialContentController.prototype, "patchParent", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Get)('parent-controls/:id/dialog-records'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SocialContentController.prototype, "records", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Post)('parent-controls/:id/sleep-mode'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], SocialContentController.prototype, "sleep", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Get)('personas'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SocialContentController.prototype, "personas", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Patch)('personas/:persona/voice'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __param(1, (0, common_1.Param)('persona')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, D.PersonaVoiceDto]),
    __metadata("design:returntype", void 0)
], SocialContentController.prototype, "personaVoice", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Post)('voice-clones/upload-token'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SocialContentController.prototype, "voiceUpload", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Get)('voice-clones'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SocialContentController.prototype, "voices", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Post)('voice-clones'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, D.VoiceCloneDto]),
    __metadata("design:returntype", void 0)
], SocialContentController.prototype, "addVoice", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Get)('voice-clones/:id'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SocialContentController.prototype, "voice", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Delete)('voice-clones/:id'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SocialContentController.prototype, "deleteVoice", null);
exports.SocialContentController = SocialContentController = __decorate([
    (0, common_1.Controller)('/api/v1'),
    __metadata("design:paramtypes", [platform_service_1.PlatformService])
], SocialContentController);
let CommerceController = class CommerceController {
    p;
    constructor(p) {
        this.p = p;
    }
    tasks(q) { return this.p.tasks(q); }
    claim(q, id) { return this.p.claimTask(q, id); }
    balance(q) { return this.p.rewardBalance(q); }
    catalog() { return this.p.rewardCatalog(); }
    redeem(q, b) { return this.p.redeem(q, b); }
    plans() { return this.p.plans(); }
    subscription(q) { return this.p.currentSubscription(q); }
    cancel(q) { return this.p.cancelRenewal(q); }
    orders(q) { return this.p.orders(q); }
    order(q, b) { return this.p.createOrder(q, b); }
    payment(b) { return this.p.payment(b); }
    products() { return this.p.products(); }
    shopOrders(q) { return this.p.shopOrders(q); }
    shopOrder(q, b) { return this.p.shopOrder(q, b); }
};
exports.CommerceController = CommerceController;
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Get)('tasks/today'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CommerceController.prototype, "tasks", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Post)('tasks/:id/claim'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], CommerceController.prototype, "claim", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Get)('rewards/balance'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CommerceController.prototype, "balance", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Get)('rewards/catalog'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CommerceController.prototype, "catalog", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Post)('rewards/redeem'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, D.RewardRedeemDto]),
    __metadata("design:returntype", void 0)
], CommerceController.prototype, "redeem", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Get)('subscription/plans'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CommerceController.prototype, "plans", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Get)('subscription/current'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CommerceController.prototype, "subscription", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Post)('subscription/cancel-renewal'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CommerceController.prototype, "cancel", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Get)('orders'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CommerceController.prototype, "orders", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Post)('orders'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, D.OrderDto]),
    __metadata("design:returntype", void 0)
], CommerceController.prototype, "order", null);
__decorate([
    (0, auth_1.Public)(),
    (0, common_1.Post)('payments/wechat/notify'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [D.PaymentNotifyDto]),
    __metadata("design:returntype", void 0)
], CommerceController.prototype, "payment", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Get)('shop/products'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CommerceController.prototype, "products", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Get)('shop/orders'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CommerceController.prototype, "shopOrders", null);
__decorate([
    (0, auth_1.Roles)('user'),
    (0, common_1.Post)('shop/orders'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, D.ShopOrderDto]),
    __metadata("design:returntype", void 0)
], CommerceController.prototype, "shopOrder", null);
exports.CommerceController = CommerceController = __decorate([
    (0, common_1.Controller)('/api/v1'),
    __metadata("design:paramtypes", [platform_service_1.PlatformService])
], CommerceController);
let AdminController = class AdminController {
    p;
    s;
    constructor(p, s) {
        this.p = p;
        this.s = s;
    }
    dashboard() { return this.p.dashboard(); }
    users() { return this.p.adminUsers(); }
    userStatus(q, id, b, r) { return this.p.userStatus(q, id, b, r.traceId ?? ''); }
    devices() { return this.p.adminDevices(); }
    orders() { return this.p.adminOrders(); }
    content() { return this.p.adminContent(); }
    addContent(q, b, r) { return this.p.addAdminContent(q, b, r.traceId ?? ''); }
    patchContent(q, id, b, r) { return this.p.patchAdminContent(q, id, b, r.traceId ?? ''); }
    deleteContent(q, id, r) { return this.p.deleteAdminContent(q, id, r.traceId ?? ''); }
    audits() { return this.p.contentAudits(); }
    audit(q, id, b, r) { return this.p.decideAudit(q, id, b, r.traceId ?? ''); }
    ota() { return this.p.otaPackages(); }
    addOta(q, b, r) { return this.p.addOta(q, b, r.traceId ?? ''); }
    expressions() { return this.p.expressionPacks(); }
    addExpression(q, b, r) { return this.p.addExpression(q, b, r.traceId ?? ''); }
    voices() { return this.p.adminVoiceClones(); }
    metrics() { return this.s.metrics(); }
    logs() { return this.p.auditLogs(); }
    events() { return this.p.adminEvents(); }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('dashboard'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "dashboard", null);
__decorate([
    (0, common_1.Get)('users'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "users", null);
__decorate([
    (0, auth_1.RequireMfa)(),
    (0, common_1.Patch)('users/:id/status'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, D.UserStatusDto, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "userStatus", null);
__decorate([
    (0, common_1.Get)('devices'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "devices", null);
__decorate([
    (0, common_1.Get)('orders'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "orders", null);
__decorate([
    (0, common_1.Get)('content-library'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "content", null);
__decorate([
    (0, auth_1.RequireMfa)(),
    (0, common_1.Post)('content-library'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, D.AdminContentDto, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "addContent", null);
__decorate([
    (0, auth_1.RequireMfa)(),
    (0, common_1.Patch)('content-library/:id'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, D.AdminContentDto, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "patchContent", null);
__decorate([
    (0, auth_1.RequireMfa)(),
    (0, common_1.Delete)('content-library/:id'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "deleteContent", null);
__decorate([
    (0, common_1.Get)('content-audits'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "audits", null);
__decorate([
    (0, auth_1.RequireMfa)(),
    (0, common_1.Patch)('content-audits/:id'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, D.AuditDecisionDto, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "audit", null);
__decorate([
    (0, common_1.Get)('ota-packages'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "ota", null);
__decorate([
    (0, auth_1.RequireMfa)(),
    (0, common_1.Post)('ota-packages'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, D.OtaPackageDto, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "addOta", null);
__decorate([
    (0, common_1.Get)('expression-packs'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "expressions", null);
__decorate([
    (0, auth_1.RequireMfa)(),
    (0, common_1.Post)('expression-packs'),
    __param(0, (0, auth_1.CurrentPrincipal)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "addExpression", null);
__decorate([
    (0, common_1.Get)('voice-clones'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "voices", null);
__decorate([
    (0, common_1.Get)('speech/metrics'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "metrics", null);
__decorate([
    (0, common_1.Get)('audit-logs'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "logs", null);
__decorate([
    (0, common_1.Get)('events'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "events", null);
exports.AdminController = AdminController = __decorate([
    (0, common_1.Controller)('/api/v1/admin'),
    (0, auth_1.Roles)('admin'),
    __metadata("design:paramtypes", [platform_service_1.PlatformService, speech_service_1.SpeechService])
], AdminController);
let WebhookController = class WebhookController {
    p;
    constructor(p) {
        this.p = p;
    }
    voice(provider, b) { return this.p.voiceWebhook(provider, b); }
    content(provider, body) { return { provider, received: true, body }; }
    cos(body) { return { received: true, event: body.event ?? 'unknown' }; }
};
exports.WebhookController = WebhookController;
__decorate([
    (0, auth_1.Public)(),
    (0, common_1.Post)('voice-clone/:provider'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Param)('provider')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], WebhookController.prototype, "voice", null);
__decorate([
    (0, auth_1.Public)(),
    (0, common_1.Post)('content-audit/:provider'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Param)('provider')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], WebhookController.prototype, "content", null);
__decorate([
    (0, auth_1.Public)(),
    (0, common_1.Post)('cos/events'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], WebhookController.prototype, "cos", null);
exports.WebhookController = WebhookController = __decorate([
    (0, common_1.Controller)('/api/v1/webhooks'),
    __metadata("design:paramtypes", [platform_service_1.PlatformService])
], WebhookController);
//# sourceMappingURL=controllers.js.map