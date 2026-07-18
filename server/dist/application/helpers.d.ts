import type { Entity } from '../domain/types';
export declare const now: () => string;
export declare const id: (p: string) => string;
export declare const entity: <T extends Record<string, any>>(p: string, v: T) => T & Entity;
export declare const sortDesc: <T extends {
    createdAt: string;
}>(xs: T[]) => T[];
