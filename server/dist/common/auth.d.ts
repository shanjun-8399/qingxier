import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppConfig } from '../config/app-config';
import type { Principal, PrincipalRole } from '../domain/types';
export declare const IS_PUBLIC = "public";
export declare const Public: () => import("@nestjs/common").CustomDecorator<string>;
export declare const ROLES = "roles";
export declare const Roles: (...r: PrincipalRole[]) => import("@nestjs/common").CustomDecorator<string>;
export declare const MFA = "mfa";
export declare const RequireMfa: () => import("@nestjs/common").CustomDecorator<string>;
export declare const CurrentPrincipal: (...dataOrPipes: any[]) => ParameterDecorator;
export declare class AuthService {
    private c;
    constructor(c: AppConfig);
    authenticate(token?: string): Principal | undefined;
    sign(subject: string, role: PrincipalRole, expiresIn: number, extra?: Record<string, unknown>): string;
}
export declare class AuthGuard implements CanActivate {
    private r;
    private a;
    constructor(r: Reflector, a: AuthService);
    canActivate(c: ExecutionContext): boolean;
}
export declare class RolesGuard implements CanActivate {
    private r;
    constructor(r: Reflector);
    canActivate(c: ExecutionContext): boolean;
}
export declare class MfaGuard implements CanActivate {
    private r;
    constructor(r: Reflector);
    canActivate(c: ExecutionContext): boolean;
}
