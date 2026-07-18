import type { DialectCode } from '@qingxier/contracts';
import { AppConfig } from '../config/app-config';
import type { Entity, Principal, SpeechProfile } from '../domain/types';
import { type DataStore } from '../infrastructure/data-store';
import { type AiProviders, type EventBus } from '../infrastructure/integrations';
export declare class SpeechService {
    private db;
    private events;
    private ai;
    private cfg;
    constructor(db: DataStore, events: EventBus, ai: AiProviders, cfg: AppConfig);
    assertUserDevice(u: string, d: string): Promise<Entity>;
    capabilities(): Promise<{
        wakeWord: string;
        wakeModelFamily: string;
        autoDialect: boolean;
        dialects: string[];
        asrModel: string;
        cloneTtsModel: string;
        systemTtsModel: string;
        websocket: string;
    }>;
    profile(p: Principal, d: string): Promise<SpeechProfile>;
    updateProfile(p: Principal, d: string, b: any, trace: string): Promise<Entity>;
    wakeStatus(p: Principal, d: string): Promise<{
        deviceId: string;
        wakeWord: string;
        modelFamily: string;
        modelVersion: any;
        threshold: number;
        afe: boolean;
        aec: boolean;
        noiseSuppression: boolean;
        otaStatus: string;
    }>;
    createSession(p: Principal, b: any): Promise<{
        firmwareUpgradeRequired: boolean;
        sessionId: string;
        deviceId: any;
        mode: any;
        persona: any;
        wakeWord: string;
        wakeModelVersion: any;
        state: string;
        id: string;
        createdAt: string;
        updatedAt: string;
    }>;
    route(p: Principal, b: any): Promise<{
        sessionId: any;
        dialect: "mandarin" | "minnan" | "wu" | "cantonese" | "sichuanese" | "shaanxi" | "henan" | "shanghainese";
        confidence: any;
        source: string;
        stability: string;
        manualSwitchRequired: boolean;
    }>;
    tts(p: Principal, b: any, trace: string): Promise<{
        sessionId: any;
        model: any;
        voiceMode: string;
        voiceId: any;
        providerDialect: any;
        degraded: boolean;
        fallbackReason: string | undefined;
        traceId: string;
        audioUrl: string;
        durationMs: number;
    }>;
    dialog(p: Principal, b: any, trace: string): Promise<{
        conversationId: string;
        replyText: string;
        audioUrl: string;
        expressionId: string;
        dialect: any;
        tts: {
            model: any;
            voiceMode: string;
            degraded: boolean;
        };
    }>;
    dialogs(p: Principal, d?: string): Promise<{
        createdAt: string;
    }[]>;
    turns(p: Principal, id: string): Promise<Entity[]>;
    recognize(p: Principal, sessionId: string, audio: string): Promise<{
        sessionId: any;
        dialect: "mandarin" | "minnan" | "wu" | "cantonese" | "sichuanese" | "shaanxi" | "henan" | "shanghainese";
        confidence: any;
        source: string;
        stability: string;
        manualSwitchRequired: boolean;
        text: string;
        dialectCandidate: DialectCode;
    }>;
    complete(p: Principal, id: string): Promise<Entity>;
    wakePackages(): Promise<Entity[]>;
    registerWake(p: Principal, b: any, key: string | undefined, trace: string): Promise<any>;
    metrics(): Promise<{
        activeSessions: number;
        totalSessions: number;
        totalTurns: number;
        dialectDistribution: any;
        slo: {
            endToEndP95Ms: number;
            targetMs: number;
        };
    }>;
    private session;
}
