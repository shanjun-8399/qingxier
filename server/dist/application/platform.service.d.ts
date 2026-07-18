import { AppConfig } from '../config/app-config';
import { AuthService } from '../common/auth';
import type { Entity, Principal, User } from '../domain/types';
import { type DataStore } from '../infrastructure/data-store';
import { type AiProviders, type EventBus } from '../infrastructure/integrations';
import { SpeechService } from './speech.service';
export declare class PlatformService {
    private readonly db;
    private readonly events;
    private readonly ai;
    private readonly config;
    private readonly auth;
    private readonly speech;
    constructor(db: DataStore, events: EventBus, ai: AiProviders, config: AppConfig, auth: AuthService, speech: SpeechService);
    health(): {
        status: string;
        service: string;
        version: string;
        environment: string;
    };
    ready(): Promise<{
        status: string;
        storage: string;
        events: string;
        providers: string;
        reason?: undefined;
    } | {
        status: string;
        storage: string;
        events: string;
        providers: string;
        reason: string;
    }>;
    login(body: any): Promise<{
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
        user: User;
        needBindPhone: boolean;
    }>;
    refresh(_body: any): Promise<{
        accessToken: string;
        expiresIn: number;
    }>;
    bindPhone(p: Principal, body: any): Promise<Entity>;
    me(p: Principal): Promise<User>;
    updateMe(p: Principal, body: any): Promise<Entity>;
    exportMe(p: Principal): Promise<{
        user: User;
        devices: {
            [x: string]: any;
            id: string;
            createdAt: string;
            updatedAt: string;
        }[];
        reminders: {
            createdAt: string;
        }[];
        messages: {
            createdAt: string;
        }[];
        generatedAt: string;
    }>;
    deleteMe(p: Principal): Promise<{
        deleted: boolean;
        retentionDays: number;
    }>;
    addresses(p: Principal): Promise<Entity[]>;
    addAddress(p: Principal, body: any): Promise<any>;
    patchAddress(p: Principal, aid: string, body: any): Promise<Entity>;
    deleteAddress(p: Principal, aid: string): Promise<{
        deleted: boolean;
    }>;
    bindTicket(_p: Principal, body: any): Promise<{
        ticket: string;
        deviceId: any;
        expiresAt: string;
        cloudMqttHost: string;
        cloudWsHost: string;
    }>;
    bindDevice(p: Principal, body: any): Promise<{
        device: Entity;
        binding: {
            userId: string;
            deviceId: any;
        };
        mqttUsername: string;
    }>;
    devices(p: Principal): Promise<{
        [x: string]: any;
        id: string;
        createdAt: string;
        updatedAt: string;
    }[]>;
    deviceStatus(p: Principal, did: string): Promise<{
        [x: string]: any;
        id: string;
        createdAt: string;
        updatedAt: string;
    }>;
    updateDevice(p: Principal, did: string, body: any): Promise<{
        [x: string]: any;
        id: string;
        createdAt: string;
        updatedAt: string;
    }>;
    unbind(p: Principal, did: string): Promise<{
        success: boolean;
    }>;
    command(p: Principal, did: string, body: any, traceId: string): Promise<{
        commandId: string;
        status: string;
    }>;
    reminders(p: Principal): Promise<{
        createdAt: string;
    }[]>;
    addReminder(p: Principal, body: any): Promise<any>;
    patchReminder(p: Principal, rid: string, body: any): Promise<Entity>;
    deleteReminder(p: Principal, rid: string): Promise<{
        deleted: boolean;
    }>;
    confirmReminder(p: Principal, rid: string, body: any): Promise<{
        reminderId: string;
        userId: string;
        status: string;
        source: any;
        confirmedAt: any;
        angerDelta: number;
    } & Entity>;
    reminderEvents(p: Principal, rid: string): Promise<Entity[]>;
    invitations(p: Principal): Promise<Entity[]>;
    invite(p: Principal, body: any): Promise<{
        ownerUserId: string;
        targetUserId: any;
        relationType: any;
        status: string;
        nickname: any;
        inviteCode: string;
        expiresAt: string;
    } & Entity>;
    decideInvitation(p: Principal, rid: string, accept: boolean, body: any): Promise<Entity>;
    relations(p: Principal): Promise<Entity[]>;
    deleteRelation(p: Principal, rid: string): Promise<{
        deleted: boolean;
    }>;
    messages(p: Principal): Promise<{
        createdAt: string;
    }[]>;
    sendMessage(p: Principal, body: any): Promise<{
        senderId: string;
        receiverId: any;
        relationId: string;
        receiverDeviceId: any;
        messageType: any;
        text: any;
        audioUrl: any;
        deliveryStatus: string;
    } & Entity>;
    readMessage(p: Principal, mid: string): Promise<Entity>;
    categories(): Promise<{
        name: any;
        count: number;
    }[]>;
    kidsContent(category?: string): Promise<Entity[]>;
    qas(p: Principal): Promise<Entity[]>;
    addQa(p: Principal, body: any): Promise<any>;
    patchQa(p: Principal, qid: string, body: any): Promise<Entity>;
    deleteQa(p: Principal, qid: string): Promise<{
        deleted: boolean;
    }>;
    uploadToken(p: Principal, kind: string): {
        uploadUrl: string;
        objectKey: string;
        expiresIn: number;
        headers: {
            'x-qingxier-upload': string;
        };
    };
    customContents(p: Principal): Promise<Entity[]>;
    addCustomContent(p: Principal, body: any): Promise<any>;
    deleteCustomContent(p: Principal, cid: string): Promise<{
        deleted: boolean;
    }>;
    parentControl(p: Principal, did: string): Promise<Entity>;
    updateParentControl(p: Principal, did: string, body: any, traceId: string): Promise<Entity>;
    parentRecords(p: Principal, did: string): Promise<any[]>;
    sleepMode(p: Principal, did: string, traceId: string): Promise<{
        queued: boolean;
    }>;
    personas(): Promise<Entity[]>;
    setPersonaVoice(p: Principal, persona: string, body: any): Promise<{
        voiceId: any;
        userId: string;
        id: string;
        createdAt: string;
        updatedAt: string;
    }>;
    voiceClones(p: Principal): Promise<Entity[]>;
    addVoiceClone(p: Principal, body: any): Promise<any>;
    voiceClone(p: Principal, vid: string): Promise<Entity>;
    deleteVoiceClone(p: Principal, vid: string): Promise<{
        deleted: boolean;
    }>;
    voiceWebhook(provider: string, body: any): Promise<Entity>;
    tasks(p: Principal): Promise<any[]>;
    claimTask(p: Principal, tid: string): Promise<{
        progress: Entity;
        reward: any;
        balance: number;
    }>;
    rewardBalance(p: Principal): Promise<{
        balance: number;
        ledger: {
            createdAt: string;
        }[];
    }>;
    rewardCatalog(): Promise<Entity[]>;
    redeem(p: Principal, body: any): Promise<{
        success: boolean;
        balance: number;
        product: Entity;
    }>;
    plans(): Promise<Entity[]>;
    currentSubscription(p: Principal): Promise<{
        level: "free" | "basic" | "premium";
        plan: Entity | null;
        autoRenew: boolean;
        expiresAt: null;
    }>;
    orders(p: Principal): Promise<{
        createdAt: string;
    }[]>;
    createOrder(p: Principal, body: any): Promise<{
        wechatPay: {
            timeStamp: string;
            nonceStr: string;
            package: string;
            signType: string;
            paySign: string;
        };
        userId: string;
        orderNo: string;
        type: string;
        planId: any;
        billingCycle: any;
        amount: any;
        status: string;
        id: string;
        createdAt: string;
        updatedAt: string;
    }>;
    payment(body: any): Promise<Entity>;
    cancelRenewal(p: Principal): {
        userId: string;
        autoRenew: boolean;
        effectiveAt: string;
    };
    products(): Promise<Entity[]>;
    shopOrder(p: Principal, body: any): Promise<{
        userId: string;
        orderNo: string;
        type: string;
        productId: string;
        quantity: any;
        addressId: any;
        amount: number;
        status: string;
    } & Entity>;
    shopOrders(p: Principal): Promise<{
        createdAt: string;
    }[]>;
    mood(p: Principal): Promise<{
        weekStart: string;
        distribution: {
            happy: number;
            calm: number;
            tired: number;
            anxious: number;
        };
        keywords: string[];
        conversationCount: number;
        suggestion: string;
    }>;
    otaCheck(p: Principal, did: string, current?: string): Promise<{
        id: string;
        createdAt: string;
        updatedAt: string;
        hasUpdate: boolean;
        jobId: string;
    } | {
        hasUpdate: boolean;
    }>;
    otaReport(p: Principal, body: any): Promise<any>;
    dashboard(): Promise<{
        users: number;
        devices: number;
        onlineDevices: number;
        orders: number;
        revenue: number;
        messages: number;
        content: number;
    }>;
    adminUsers(): Promise<Entity[]>;
    userStatus(p: Principal, uid: string, body: any, trace: string): Promise<Entity>;
    adminDevices(): Promise<{
        statusSnapshot: Entity | null;
        id: string;
        createdAt: string;
        updatedAt: string;
    }[]>;
    adminOrders(): Promise<Entity[]>;
    adminContent(): Promise<Entity[]>;
    addAdminContent(p: Principal, body: any, trace: string): Promise<any>;
    patchAdminContent(p: Principal, cid: string, body: any, trace: string): Promise<Entity>;
    deleteAdminContent(p: Principal, cid: string, trace: string): Promise<{
        deleted: boolean;
    }>;
    contentAudits(): Promise<{
        id: any;
        type: string;
        ownerUserId: any;
        status: any;
        title: any;
        createdAt: any;
    }[]>;
    decideAudit(p: Principal, itemId: string, body: any, trace: string): Promise<Entity>;
    otaPackages(): Promise<Entity[]>;
    addOta(p: Principal, body: any, trace: string): Promise<any>;
    expressionPacks(): Promise<Entity[]>;
    addExpression(p: Principal, body: any, trace: string): Promise<any>;
    auditLogs(): Promise<Entity[]>;
    adminVoiceClones(): Promise<Entity[]>;
    adminEvents(): {
        topic: string;
        payload: Record<string, unknown>;
    }[];
    private own;
    private clearDefaults;
    private ensureLimit;
    private nextTrigger;
    private audit;
}
