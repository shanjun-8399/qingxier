import { OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { AppConfig } from '../config/app-config';
import type { CollectionName, Entity } from '../domain/types';
export interface DataStore {
    ping(): Promise<boolean>;
    get<T extends Entity>(c: CollectionName, id: string): Promise<T | null>;
    find<T extends Entity>(c: CollectionName, f?: Record<string, unknown>): Promise<T[]>;
    insert<T extends Entity>(c: CollectionName, v: T): Promise<T>;
    patch<T extends Entity>(c: CollectionName, id: string, p: Partial<T>): Promise<T>;
    remove(c: CollectionName, id: string): Promise<boolean>;
}
export declare const DATA_STORE: unique symbol;
export declare class MemoryDataStore implements DataStore {
    private m;
    constructor();
    ping(): Promise<boolean>;
    get<T extends Entity>(c: CollectionName, id: string): Promise<T | null>;
    find<T extends Entity>(c: CollectionName, f?: Record<string, unknown>): Promise<T[]>;
    insert<T extends Entity>(c: CollectionName, v: T): Promise<T>;
    patch<T extends Entity>(c: CollectionName, id: string, p: Partial<T>): Promise<T>;
    remove(c: CollectionName, id: string): Promise<boolean>;
    private b;
    private put;
    private seed;
}
export declare class MongoDataStore implements DataStore, OnModuleInit, OnApplicationShutdown {
    private cfg;
    private c?;
    private db?;
    constructor(cfg: AppConfig);
    onModuleInit(): Promise<void>;
    onApplicationShutdown(): Promise<void>;
    private col;
    ping(): Promise<boolean>;
    get<T extends Entity>(n: CollectionName, id: string): Promise<T | null>;
    find<T extends Entity>(n: CollectionName, f?: Record<string, unknown>): Promise<T[]>;
    insert<T extends Entity>(n: CollectionName, v: T): Promise<T>;
    patch<T extends Entity>(n: CollectionName, id: string, p: Partial<T>): Promise<T>;
    remove(n: CollectionName, id: string): Promise<boolean>;
}
export declare const dataStoreProvider: {
    provide: symbol;
    inject: (typeof AppConfig)[];
    useFactory: (c: AppConfig) => DataStore;
};
