import { type DialectCode, type Mode, type Persona } from '@qingxier/contracts';
export declare class WechatLoginDto {
    code: string;
    deviceBindTicket?: string;
}
export declare class RefreshDto {
    refreshToken: string;
}
export declare class PhoneBindDto {
    phone: string;
    smsCode: string;
}
export declare class UpdateUserDto {
    nickname?: string;
    avatarUrl?: string;
    birthDate?: string;
    defaultMode?: Mode;
    defaultPersona?: Persona;
    consentFlags?: Record<string, boolean>;
}
export declare class AddressDto {
    recipient: string;
    phone: string;
    address: string;
    isDefault?: boolean;
}
export declare class BindTicketDto {
    deviceSn: string;
    model: string;
    blePublicKey: string;
}
export declare class BindDeviceDto {
    ticket: string;
    deviceId: string;
    bindProof: string;
}
export declare class UpdateDeviceDto {
    name?: string;
    defaultMode?: Mode;
    defaultPersona?: Persona;
}
export declare class DeviceCommandDto {
    commandType: string;
    payload: Record<string, unknown>;
    expireInSeconds?: number;
    needAck?: boolean;
}
export declare class SpeechProfileUpdateDto {
    autoDialect: true;
    fallbackDialect: DialectCode;
    highConfidenceThreshold: number;
    mediumConfidenceThreshold: number;
    cloneVoiceId?: string | null;
    version: number;
}
export declare class SpeechSessionDto {
    deviceId: string;
    mode: Mode;
    persona: Persona;
    wakeModelVersion: string;
    wakeWord: '阿西';
}
export declare class DialectRouteDto {
    sessionId: string;
    dialectCandidate: DialectCode;
    confidence: number;
    previousDialect?: DialectCode;
}
export declare class TtsDto {
    sessionId: string;
    text: string;
    dialect: DialectCode;
    voiceId?: string | null;
    model?: string;
}
export declare class DialogTextDto {
    deviceId: string;
    mode: Mode;
    persona: Persona;
    text: string;
    conversationId?: string;
    dialect?: DialectCode;
}
export declare class ReminderDto {
    deviceId: string;
    type: string;
    title: string;
    content: string;
    timeOfDay: string;
    repeatRule: string;
    audioAssetId?: string;
    needConfirm: boolean;
    enabled?: boolean;
}
export declare class ReminderPatchDto {
    title?: string;
    content?: string;
    timeOfDay?: string;
    repeatRule?: string;
    needConfirm?: boolean;
    enabled?: boolean;
}
export declare class ConfirmReminderDto {
    source: 'device' | 'app';
    eventId?: string;
    confirmedAt?: string;
}
export declare class InvitationDto {
    targetUserId: string;
    relationType: 'couple' | 'parent_child' | 'bestie';
    nickname?: string;
}
export declare class InvitationDecisionDto {
    nickname?: string;
}
export declare class MessageDto {
    relationId: string;
    receiverDeviceId?: string;
    messageType: 'text' | 'audio';
    text?: string;
    audioUrl?: string;
}
export declare class CustomQaDto {
    deviceId: string;
    question: string;
    answerText?: string;
    answerAudioUrl?: string;
}
export declare class CustomContentDto {
    deviceId: string;
    type: 'story' | 'song';
    title: string;
    audioUrl: string;
    duration: number;
}
export declare class ParentControlDto {
    allowedTimeRanges?: Array<{
        start: string;
        end: string;
    }>;
    contentSwitches?: Record<string, boolean>;
    maxVolume?: number;
    dialogRecordEnabled?: boolean;
    heatingEnabled?: boolean;
}
export declare class PersonaVoiceDto {
    voiceId?: string | null;
}
export declare class VoiceCloneDto {
    sampleUrl: string;
    consentRecord: string;
    persona?: Persona;
}
export declare class OrderDto {
    planId: string;
    billingCycle: 'month' | 'year';
}
export declare class ShopOrderDto {
    productId: string;
    quantity: number;
    addressId: string;
}
export declare class RewardRedeemDto {
    productId: string;
}
export declare class OtaReportDto {
    jobId: string;
    status: string;
    progress: number;
    errorCode?: string;
}
export declare class OtaPackageDto {
    type: string;
    version: string;
    url: string;
    sha256: string;
    mandatory: boolean;
    compatibleModels: string[];
    rolloutPercent: number;
}
export declare class WakeWordPackageDto {
    type: 'wake_words';
    wakeWord: '阿西';
    modelFamily: 'WakeNet9';
    version: string;
    url: string;
    sha256: string;
    compatibleModels: string[];
    rolloutPercent: number;
    mandatory: boolean;
    rollbackVersion?: string;
}
export declare class AdminContentDto {
    type: string;
    category: string;
    title: string;
    text?: string;
    audioUrl?: string;
    duration?: number;
    enabled?: boolean;
}
export declare class AuditDecisionDto {
    status: 'approved' | 'rejected';
    reason?: string;
}
export declare class UserStatusDto {
    status: 'active' | 'disabled';
}
export declare class PaymentNotifyDto {
    orderNo: string;
    transactionId: string;
    tradeState: 'SUCCESS' | 'REFUND';
    signature: string;
}
