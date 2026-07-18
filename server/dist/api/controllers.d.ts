import type { Request } from 'express';
import type { Principal } from '../domain/types';
import { PlatformService } from '../application/platform.service';
import { SpeechService } from '../application/speech.service';
import * as D from './dto';
export declare class HealthController {
    private readonly platform;
    constructor(platform: PlatformService);
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
}
export declare class UserController {
    private readonly p;
    constructor(p: PlatformService);
    login(b: D.WechatLoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
        user: import("../domain/types").User;
        needBindPhone: boolean;
    }>;
    refresh(b: D.RefreshDto): Promise<{
        accessToken: string;
        expiresIn: number;
    }>;
    phone(q: Principal, b: D.PhoneBindDto): Promise<import("../domain/types").Entity>;
    me(q: Principal): Promise<import("../domain/types").User>;
    update(q: Principal, b: D.UpdateUserDto): Promise<import("../domain/types").Entity>;
    export(q: Principal): Promise<{
        user: import("../domain/types").User;
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
    remove(q: Principal): Promise<{
        deleted: boolean;
        retentionDays: number;
    }>;
    addresses(q: Principal): Promise<import("../domain/types").Entity[]>;
    addAddress(q: Principal, b: D.AddressDto): Promise<any>;
    patchAddress(q: Principal, id: string, b: D.AddressDto): Promise<import("../domain/types").Entity>;
    deleteAddress(q: Principal, id: string): Promise<{
        deleted: boolean;
    }>;
}
export declare class DeviceSpeechController {
    private readonly p;
    private readonly s;
    constructor(p: PlatformService, s: SpeechService);
    bindTicket(q: Principal, b: D.BindTicketDto): Promise<{
        ticket: string;
        deviceId: any;
        expiresAt: string;
        cloudMqttHost: string;
        cloudWsHost: string;
    }>;
    bind(q: Principal, b: D.BindDeviceDto): Promise<{
        device: import("../domain/types").Entity;
        binding: {
            userId: string;
            deviceId: any;
        };
        mqttUsername: string;
    }>;
    devices(q: Principal): Promise<{
        [x: string]: any;
        id: string;
        createdAt: string;
        updatedAt: string;
    }[]>;
    status(q: Principal, id: string): Promise<{
        [x: string]: any;
        id: string;
        createdAt: string;
        updatedAt: string;
    }>;
    update(q: Principal, id: string, b: D.UpdateDeviceDto): Promise<{
        [x: string]: any;
        id: string;
        createdAt: string;
        updatedAt: string;
    }>;
    unbind(q: Principal, id: string): Promise<{
        success: boolean;
    }>;
    command(q: Principal, id: string, b: D.DeviceCommandDto, r: Request & {
        traceId?: string;
    }): Promise<{
        commandId: string;
        status: string;
    }>;
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
    profile(q: Principal, id: string): Promise<import("../domain/types").SpeechProfile>;
    patchProfile(q: Principal, id: string, b: D.SpeechProfileUpdateDto, r: Request & {
        traceId?: string;
    }): Promise<import("../domain/types").Entity>;
    wake(q: Principal, id: string): Promise<{
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
    session(q: Principal, b: D.SpeechSessionDto): Promise<{
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
    route(q: Principal, b: D.DialectRouteDto): Promise<{
        sessionId: any;
        dialect: "mandarin" | "minnan" | "wu" | "cantonese" | "sichuanese" | "shaanxi" | "henan" | "shanghainese";
        confidence: any;
        source: string;
        stability: string;
        manualSwitchRequired: boolean;
    }>;
    tts(q: Principal, b: D.TtsDto, r: Request & {
        traceId?: string;
    }): Promise<{
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
    ota(q: Principal, id: string, v?: string): Promise<{
        id: string;
        createdAt: string;
        updatedAt: string;
        hasUpdate: boolean;
        jobId: string;
    } | {
        hasUpdate: boolean;
    }>;
    report(q: Principal, b: D.OtaReportDto): Promise<any>;
    wakePackages(): Promise<import("../domain/types").Entity[]>;
    wakePackage(q: Principal, b: D.WakeWordPackageDto, key: string | undefined, r: Request & {
        traceId?: string;
    }): Promise<any>;
}
export declare class InteractionController {
    private readonly p;
    private readonly s;
    constructor(p: PlatformService, s: SpeechService);
    dialog(q: Principal, b: D.DialogTextDto, r: Request & {
        traceId?: string;
    }): Promise<{
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
    dialogs(q: Principal, d?: string): Promise<{
        createdAt: string;
    }[]>;
    turns(q: Principal, id: string): Promise<import("../domain/types").Entity[]>;
    mood(q: Principal): Promise<{
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
    reminders(q: Principal): Promise<{
        createdAt: string;
    }[]>;
    addReminder(q: Principal, b: D.ReminderDto): Promise<any>;
    patchReminder(q: Principal, id: string, b: D.ReminderPatchDto): Promise<import("../domain/types").Entity>;
    deleteReminder(q: Principal, id: string): Promise<{
        deleted: boolean;
    }>;
    confirmReminder(q: Principal, id: string, b: D.ConfirmReminderDto): Promise<{
        reminderId: string;
        userId: string;
        status: string;
        source: any;
        confirmedAt: any;
        angerDelta: number;
    } & import("../domain/types").Entity>;
    reminderEvents(q: Principal, id: string): Promise<import("../domain/types").Entity[]>;
}
export declare class SocialContentController {
    private readonly p;
    constructor(p: PlatformService);
    invitations(q: Principal): Promise<import("../domain/types").Entity[]>;
    invite(q: Principal, b: D.InvitationDto): Promise<{
        ownerUserId: string;
        targetUserId: any;
        relationType: any;
        status: string;
        nickname: any;
        inviteCode: string;
        expiresAt: string;
    } & import("../domain/types").Entity>;
    accept(q: Principal, id: string, b: D.InvitationDecisionDto): Promise<import("../domain/types").Entity>;
    reject(q: Principal, id: string, b: D.InvitationDecisionDto): Promise<import("../domain/types").Entity>;
    relations(q: Principal): Promise<import("../domain/types").Entity[]>;
    deleteRelation(q: Principal, id: string): Promise<{
        deleted: boolean;
    }>;
    messages(q: Principal): Promise<{
        createdAt: string;
    }[]>;
    message(q: Principal, b: D.MessageDto): Promise<{
        senderId: string;
        receiverId: any;
        relationId: string;
        receiverDeviceId: any;
        messageType: any;
        text: any;
        audioUrl: any;
        deliveryStatus: string;
    } & import("../domain/types").Entity>;
    read(q: Principal, id: string): Promise<import("../domain/types").Entity>;
    categories(): Promise<{
        name: any;
        count: number;
    }[]>;
    content(c?: string): Promise<import("../domain/types").Entity[]>;
    qas(q: Principal): Promise<import("../domain/types").Entity[]>;
    addQa(q: Principal, b: D.CustomQaDto): Promise<any>;
    patchQa(q: Principal, id: string, b: D.CustomQaDto): Promise<import("../domain/types").Entity>;
    deleteQa(q: Principal, id: string): Promise<{
        deleted: boolean;
    }>;
    upload(q: Principal): {
        uploadUrl: string;
        objectKey: string;
        expiresIn: number;
        headers: {
            'x-qingxier-upload': string;
        };
    };
    custom(q: Principal): Promise<import("../domain/types").Entity[]>;
    addCustom(q: Principal, b: D.CustomContentDto): Promise<any>;
    deleteCustom(q: Principal, id: string): Promise<{
        deleted: boolean;
    }>;
    parent(q: Principal, id: string): Promise<import("../domain/types").Entity>;
    patchParent(q: Principal, id: string, b: D.ParentControlDto, r: Request & {
        traceId?: string;
    }): Promise<import("../domain/types").Entity>;
    records(q: Principal, id: string): Promise<any[]>;
    sleep(q: Principal, id: string, r: Request & {
        traceId?: string;
    }): Promise<{
        queued: boolean;
    }>;
    personas(): Promise<import("../domain/types").Entity[]>;
    personaVoice(q: Principal, persona: string, b: D.PersonaVoiceDto): Promise<{
        voiceId: any;
        userId: string;
        id: string;
        createdAt: string;
        updatedAt: string;
    }>;
    voiceUpload(q: Principal): {
        uploadUrl: string;
        objectKey: string;
        expiresIn: number;
        headers: {
            'x-qingxier-upload': string;
        };
    };
    voices(q: Principal): Promise<import("../domain/types").Entity[]>;
    addVoice(q: Principal, b: D.VoiceCloneDto): Promise<any>;
    voice(q: Principal, id: string): Promise<import("../domain/types").Entity>;
    deleteVoice(q: Principal, id: string): Promise<{
        deleted: boolean;
    }>;
}
export declare class CommerceController {
    private readonly p;
    constructor(p: PlatformService);
    tasks(q: Principal): Promise<any[]>;
    claim(q: Principal, id: string): Promise<{
        progress: import("../domain/types").Entity;
        reward: any;
        balance: number;
    }>;
    balance(q: Principal): Promise<{
        balance: number;
        ledger: {
            createdAt: string;
        }[];
    }>;
    catalog(): Promise<import("../domain/types").Entity[]>;
    redeem(q: Principal, b: D.RewardRedeemDto): Promise<{
        success: boolean;
        balance: number;
        product: import("../domain/types").Entity;
    }>;
    plans(): Promise<import("../domain/types").Entity[]>;
    subscription(q: Principal): Promise<{
        level: "free" | "basic" | "premium";
        plan: import("../domain/types").Entity | null;
        autoRenew: boolean;
        expiresAt: null;
    }>;
    cancel(q: Principal): {
        userId: string;
        autoRenew: boolean;
        effectiveAt: string;
    };
    orders(q: Principal): Promise<{
        createdAt: string;
    }[]>;
    order(q: Principal, b: D.OrderDto): Promise<{
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
    payment(b: D.PaymentNotifyDto): Promise<import("../domain/types").Entity>;
    products(): Promise<import("../domain/types").Entity[]>;
    shopOrders(q: Principal): Promise<{
        createdAt: string;
    }[]>;
    shopOrder(q: Principal, b: D.ShopOrderDto): Promise<{
        userId: string;
        orderNo: string;
        type: string;
        productId: string;
        quantity: any;
        addressId: any;
        amount: number;
        status: string;
    } & import("../domain/types").Entity>;
}
export declare class AdminController {
    private readonly p;
    private readonly s;
    constructor(p: PlatformService, s: SpeechService);
    dashboard(): Promise<{
        users: number;
        devices: number;
        onlineDevices: number;
        orders: number;
        revenue: number;
        messages: number;
        content: number;
    }>;
    users(): Promise<import("../domain/types").Entity[]>;
    userStatus(q: Principal, id: string, b: D.UserStatusDto, r: Request & {
        traceId?: string;
    }): Promise<import("../domain/types").Entity>;
    devices(): Promise<{
        statusSnapshot: import("../domain/types").Entity | null;
        id: string;
        createdAt: string;
        updatedAt: string;
    }[]>;
    orders(): Promise<import("../domain/types").Entity[]>;
    content(): Promise<import("../domain/types").Entity[]>;
    addContent(q: Principal, b: D.AdminContentDto, r: Request & {
        traceId?: string;
    }): Promise<any>;
    patchContent(q: Principal, id: string, b: D.AdminContentDto, r: Request & {
        traceId?: string;
    }): Promise<import("../domain/types").Entity>;
    deleteContent(q: Principal, id: string, r: Request & {
        traceId?: string;
    }): Promise<{
        deleted: boolean;
    }>;
    audits(): Promise<{
        id: any;
        type: string;
        ownerUserId: any;
        status: any;
        title: any;
        createdAt: any;
    }[]>;
    audit(q: Principal, id: string, b: D.AuditDecisionDto, r: Request & {
        traceId?: string;
    }): Promise<import("../domain/types").Entity>;
    ota(): Promise<import("../domain/types").Entity[]>;
    addOta(q: Principal, b: D.OtaPackageDto, r: Request & {
        traceId?: string;
    }): Promise<any>;
    expressions(): Promise<import("../domain/types").Entity[]>;
    addExpression(q: Principal, b: any, r: Request & {
        traceId?: string;
    }): Promise<any>;
    voices(): Promise<import("../domain/types").Entity[]>;
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
    logs(): Promise<import("../domain/types").Entity[]>;
    events(): {
        topic: string;
        payload: Record<string, unknown>;
    }[];
}
export declare class WebhookController {
    private readonly p;
    constructor(p: PlatformService);
    voice(provider: string, b: any): Promise<import("../domain/types").Entity>;
    content(provider: string, body: any): {
        provider: string;
        received: boolean;
        body: any;
    };
    cos(body: any): {
        received: boolean;
        event: any;
    };
}
