import { HttpException } from '@nestjs/common';
export declare class DomainError extends HttpException {
    readonly code: number;
    readonly error: string;
    readonly data?: unknown | undefined;
    constructor(status: number, code: number, error: string, message: string, data?: unknown | undefined);
}
export declare const invalid: (m?: string, d?: unknown) => DomainError;
export declare const unauthorized: (m?: string) => DomainError;
export declare const forbidden: (m?: string) => DomainError;
export declare const notFound: (m?: string) => DomainError;
export declare const conflict: (m?: string, d?: unknown) => DomainError;
export declare const limited: (m?: string) => DomainError;
