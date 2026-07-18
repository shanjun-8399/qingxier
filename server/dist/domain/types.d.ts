import type { DialectCode, Mode, Persona, PrincipalRole as ContractPrincipalRole } from '@qingxier/contracts';
export type PrincipalRole = ContractPrincipalRole;
export interface Principal {
    role: PrincipalRole;
    subject: string;
    deviceId?: string;
    mfa?: boolean;
}
export interface Entity {
    id: string;
    createdAt: string;
    updatedAt: string;
    [key: string]: any;
}
export type CollectionName = 'users' | 'devices' | 'bindings' | 'deviceStatuses' | 'speechProfiles' | 'speechSessions' | 'conversations' | 'conversationTurns' | 'reminders' | 'reminderEvents' | 'relationships' | 'messages' | 'contentItems' | 'customQas' | 'customContents' | 'voiceClones' | 'personas' | 'tasks' | 'taskProgress' | 'subscriptions' | 'orders' | 'addresses' | 'products' | 'rewardLedger' | 'otaPackages' | 'wakeWordPackages' | 'parentControls' | 'auditLogs' | 'contentAudits' | 'expressionPacks';
export interface User extends Entity {
    openId: string;
    phone?: string;
    nickname: string;
    defaultMode: Mode;
    defaultPersona: Persona;
    subscriptionLevel: 'free' | 'basic' | 'premium';
    status: 'active' | 'disabled';
    consentFlags: Record<string, boolean>;
}
export interface Device extends Entity {
    deviceId: string;
    sn: string;
    name: string;
    model: string;
    hardwareRev: string;
    firmwareVersion: string;
    wakeModelVersion: string;
    status: 'active' | 'disabled';
}
export interface SpeechProfile extends Entity {
    deviceId: string;
    autoDialect: true;
    fallbackDialect: DialectCode;
    highConfidenceThreshold: number;
    mediumConfidenceThreshold: number;
    cloneVoiceId: string | null;
    cloneModel: string;
    systemModel: string;
    version: number;
}
