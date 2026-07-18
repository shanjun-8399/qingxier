export declare const DIALECTS: readonly ["mandarin", "minnan", "wu", "cantonese", "sichuanese", "shaanxi", "henan", "shanghainese"];
export type DialectCode = typeof DIALECTS[number];
export type Mode = 'child' | 'adult';
export type Persona = 'mom' | 'dad' | 'lover' | 'teacher' | 'bestie';
export type PrincipalRole = 'user' | 'device' | 'admin';
export interface ApiEnvelope<T> {
    code: number;
    message: string;
    data: T;
    traceId: string;
}
export interface ApiErrorEnvelope {
    code: number;
    message: string;
    error: string;
    data?: unknown;
    traceId: string;
}
export interface DeviceSummary {
    deviceId: string;
    name: string;
    online: boolean;
    batteryPercent: number;
    charging: boolean;
    firmwareVersion: string;
    currentMode: Mode;
    currentPersona: Persona;
    lastSeenAt: string;
}
export interface SpeechProfile {
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
export declare const api: {
    readonly login: "/api/v1/auth/wechat-login";
    readonly refresh: "/api/v1/auth/refresh";
    readonly phoneBind: "/api/v1/auth/phone-bind";
    readonly me: "/api/v1/users/me";
    readonly addresses: "/api/v1/users/me/addresses";
    readonly devices: "/api/v1/devices";
    readonly device: (id: string) => string;
    readonly deviceStatus: (id: string) => string;
    readonly deviceCommands: (id: string) => string;
    readonly speechCapabilities: "/api/v1/speech/capabilities";
    readonly speechProfile: (id: string) => string;
    readonly wakeWordStatus: (id: string) => string;
    readonly speechSessions: "/api/v1/speech/sessions";
    readonly speechRoute: "/api/v1/speech/route";
    readonly speechTts: "/api/v1/speech/tts";
    readonly dialogs: "/api/v1/dialogs";
    readonly dialogText: "/api/v1/dialogs/text";
    readonly dialogTurns: (id: string) => string;
    readonly moodWeekly: "/api/v1/mood-reports/weekly";
    readonly reminders: "/api/v1/reminders";
    readonly reminder: (id: string) => string;
    readonly reminderConfirm: (id: string) => string;
    readonly invitations: "/api/v1/relations/invitations";
    readonly relations: "/api/v1/relations";
    readonly messages: "/api/v1/messages";
    readonly messageRead: (id: string) => string;
    readonly kidsCategories: "/api/v1/kids/content/categories";
    readonly kidsContent: "/api/v1/kids/content";
    readonly customQas: "/api/v1/custom-qas";
    readonly customContents: "/api/v1/custom-contents";
    readonly customContentUpload: "/api/v1/custom-contents/upload-token";
    readonly parentControl: (id: string) => string;
    readonly parentRecords: (id: string) => string;
    readonly sleepMode: (id: string) => string;
    readonly personas: "/api/v1/personas";
    readonly voiceClones: "/api/v1/voice-clones";
    readonly voiceCloneUpload: "/api/v1/voice-clones/upload-token";
    readonly tasks: "/api/v1/tasks/today";
    readonly rewards: "/api/v1/rewards/balance";
    readonly rewardCatalog: "/api/v1/rewards/catalog";
    readonly plans: "/api/v1/subscription/plans";
    readonly subscription: "/api/v1/subscription/current";
    readonly orders: "/api/v1/orders";
    readonly products: "/api/v1/shop/products";
    readonly shopOrders: "/api/v1/shop/orders";
    readonly adminDashboard: "/api/v1/admin/dashboard";
    readonly adminUsers: "/api/v1/admin/users";
    readonly adminDevices: "/api/v1/admin/devices";
    readonly adminOrders: "/api/v1/admin/orders";
    readonly adminContent: "/api/v1/admin/content-library";
    readonly adminAudits: "/api/v1/admin/content-audits";
    readonly adminOta: "/api/v1/admin/ota-packages";
    readonly adminWakeWords: "/api/v1/admin/wake-word-packages";
    readonly adminMetrics: "/api/v1/admin/speech/metrics";
    readonly adminLogs: "/api/v1/admin/audit-logs";
};
