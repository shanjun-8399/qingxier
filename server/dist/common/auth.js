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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MfaGuard = exports.RolesGuard = exports.AuthGuard = exports.AuthService = exports.CurrentPrincipal = exports.RequireMfa = exports.MFA = exports.Roles = exports.ROLES = exports.Public = exports.IS_PUBLIC = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const app_config_1 = require("../config/app-config");
exports.IS_PUBLIC = 'public';
const Public = () => (0, common_1.SetMetadata)(exports.IS_PUBLIC, true);
exports.Public = Public;
exports.ROLES = 'roles';
const Roles = (...r) => (0, common_1.SetMetadata)(exports.ROLES, r);
exports.Roles = Roles;
exports.MFA = 'mfa';
const RequireMfa = () => (0, common_1.SetMetadata)(exports.MFA, true);
exports.RequireMfa = RequireMfa;
exports.CurrentPrincipal = (0, common_1.createParamDecorator)((_d, c) => c.switchToHttp().getRequest().principal);
const STATIC = { 'user-token': { role: 'user', subject: 'u_1' }, 'user-token-2': { role: 'user', subject: 'u_2' }, 'device-token': { role: 'device', subject: 'd_001', deviceId: 'd_001' }, 'device-token-2': { role: 'device', subject: 'd_002', deviceId: 'd_002' }, 'admin-token': { role: 'admin', subject: 'a_1', mfa: true } };
let AuthService = class AuthService {
    c;
    constructor(c) {
        this.c = c;
    }
    authenticate(token) { if (!token)
        return undefined; if (this.c.authMode === 'static')
        return STATIC[token]; try {
        const p = jsonwebtoken_1.default.verify(token, this.c.jwtSecret, { algorithms: ['HS256'], issuer: this.c.jwtIssuer });
        if (!['user', 'device', 'admin'].includes(p.role))
            return undefined;
        return { role: p.role, subject: String(p.sub), deviceId: p.deviceId ? String(p.deviceId) : undefined, mfa: Boolean(p.mfa) };
    }
    catch {
        return undefined;
    } }
    sign(subject, role, expiresIn, extra = {}) { if (this.c.authMode === 'static')
        return role === 'user' ? 'user-token' : role === 'device' ? 'device-token' : 'admin-token'; return jsonwebtoken_1.default.sign({ role, ...extra }, this.c.jwtSecret, { algorithm: 'HS256', issuer: this.c.jwtIssuer, subject, expiresIn }); }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [app_config_1.AppConfig])
], AuthService);
let AuthGuard = class AuthGuard {
    r;
    a;
    constructor(r, a) {
        this.r = r;
        this.a = a;
    }
    canActivate(c) { if (this.r.getAllAndOverride(exports.IS_PUBLIC, [c.getHandler(), c.getClass()]))
        return true; const q = c.switchToHttp().getRequest(); const t = (q.header('X-Device-Token') ?? q.header('Authorization')?.replace(/^Bearer\s+/i, '')); const p = this.a.authenticate(t); if (!p)
        throw new common_1.UnauthorizedException('凭据无效'); q.principal = p; return true; }
};
exports.AuthGuard = AuthGuard;
exports.AuthGuard = AuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector, AuthService])
], AuthGuard);
let RolesGuard = class RolesGuard {
    r;
    constructor(r) {
        this.r = r;
    }
    canActivate(c) { const rs = this.r.getAllAndOverride(exports.ROLES, [c.getHandler(), c.getClass()]); if (!rs?.length)
        return true; const p = c.switchToHttp().getRequest().principal; if (!p || !rs.includes(p.role))
        throw new common_1.ForbiddenException('角色无权访问'); return true; }
};
exports.RolesGuard = RolesGuard;
exports.RolesGuard = RolesGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], RolesGuard);
let MfaGuard = class MfaGuard {
    r;
    constructor(r) {
        this.r = r;
    }
    canActivate(c) { if (!this.r.getAllAndOverride(exports.MFA, [c.getHandler(), c.getClass()]))
        return true; const q = c.switchToHttp().getRequest(); if (!q.principal?.mfa || q.header('X-MFA-Verified') !== 'true')
        throw new common_1.ForbiddenException('管理员敏感操作需要 MFA'); return true; }
};
exports.MfaGuard = MfaGuard;
exports.MfaGuard = MfaGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], MfaGuard);
//# sourceMappingURL=auth.js.map