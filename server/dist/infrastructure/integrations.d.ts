import type { DialectCode } from '@qingxier/contracts';
import { AppConfig } from '../config/app-config';
export interface EventBus {
    publish(t: string, p: Record<string, unknown>): Promise<void>;
    events(): Array<{
        topic: string;
        payload: Record<string, unknown>;
    }>;
    close(): Promise<void>;
}
export declare const EVENT_BUS: unique symbol;
export declare class MemoryEventBus implements EventBus {
    private l;
    publish(topic: string, payload: Record<string, unknown>): Promise<void>;
    events(): {
        topic: string;
        payload: Record<string, unknown>;
    }[];
    close(): Promise<void>;
}
export declare class MqttEventBus implements EventBus {
    private c;
    constructor(u: string);
    publish(t: string, p: Record<string, unknown>): Promise<void>;
    events(): never[];
    close(): Promise<void>;
}
export declare const eventBusProvider: {
    provide: symbol;
    inject: (typeof AppConfig)[];
    useFactory: (c: AppConfig) => EventBus;
};
export interface AiProviders {
    recognize(a: string): Promise<{
        text: string;
        dialectCandidate: DialectCode;
        confidence: number;
    }>;
    synthesize(i: {
        text: string;
        dialect: DialectCode;
        voiceId?: string | null;
        model: string;
    }): Promise<{
        audioUrl: string;
        durationMs: number;
    }>;
    chat(i: {
        text: string;
        persona: string;
        mode: string;
        memories: string[];
    }): Promise<string>;
    audit(i: {
        type: string;
        content: string;
    }): Promise<{
        status: 'approved' | 'rejected';
        labels: string[];
    }>;
}
export declare const AI_PROVIDERS: unique symbol;
export declare class MockAiProviders implements AiProviders {
    recognize(_a: string): Promise<{
        text: string;
        dialectCandidate: "mandarin";
        confidence: number;
    }>;
    synthesize(i: any): Promise<{
        audioUrl: string;
        durationMs: number;
    }>;
    chat(i: any): Promise<string>;
    audit(i: any): Promise<{
        status: "approved" | "rejected";
        labels: string[];
    }>;
}
export declare class DashScopeProviders implements AiProviders {
    private c;
    constructor(c: AppConfig);
    recognize(_a: string): Promise<{
        text: string;
        dialectCandidate: DialectCode;
        confidence: number;
    }>;
    synthesize(i: any): Promise<{
        audioUrl: any;
        durationMs: any;
    }>;
    chat(i: any): Promise<any>;
    audit(_i: any): Promise<{
        status: "approved";
        labels: never[];
    }>;
}
export declare const aiProvider: {
    provide: symbol;
    inject: (typeof AppConfig)[];
    useFactory: (c: AppConfig) => AiProviders;
};
