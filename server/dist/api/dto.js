"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentNotifyDto = exports.UserStatusDto = exports.AuditDecisionDto = exports.AdminContentDto = exports.WakeWordPackageDto = exports.OtaPackageDto = exports.OtaReportDto = exports.RewardRedeemDto = exports.ShopOrderDto = exports.OrderDto = exports.VoiceCloneDto = exports.PersonaVoiceDto = exports.ParentControlDto = exports.CustomContentDto = exports.CustomQaDto = exports.MessageDto = exports.InvitationDecisionDto = exports.InvitationDto = exports.ConfirmReminderDto = exports.ReminderPatchDto = exports.ReminderDto = exports.DialogTextDto = exports.TtsDto = exports.DialectRouteDto = exports.SpeechSessionDto = exports.SpeechProfileUpdateDto = exports.DeviceCommandDto = exports.UpdateDeviceDto = exports.BindDeviceDto = exports.BindTicketDto = exports.AddressDto = exports.UpdateUserDto = exports.PhoneBindDto = exports.RefreshDto = exports.WechatLoginDto = void 0;
const class_validator_1 = require("class-validator");
const contracts_1 = require("@qingxier/contracts");
class WechatLoginDto {
    code;
    deviceBindTicket;
}
exports.WechatLoginDto = WechatLoginDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(1),
    __metadata("design:type", String)
], WechatLoginDto.prototype, "code", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], WechatLoginDto.prototype, "deviceBindTicket", void 0);
class RefreshDto {
    refreshToken;
}
exports.RefreshDto = RefreshDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8),
    __metadata("design:type", String)
], RefreshDto.prototype, "refreshToken", void 0);
class PhoneBindDto {
    phone;
    smsCode;
}
exports.PhoneBindDto = PhoneBindDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^1\d{10}$/),
    __metadata("design:type", String)
], PhoneBindDto.prototype, "phone", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(4, 8),
    __metadata("design:type", String)
], PhoneBindDto.prototype, "smsCode", void 0);
class UpdateUserDto {
    nickname;
    avatarUrl;
    birthDate;
    defaultMode;
    defaultPersona;
    consentFlags;
}
exports.UpdateUserDto = UpdateUserDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(40),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "nickname", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUrl)(),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "avatarUrl", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Matches)(/^\d{4}-\d{2}-\d{2}$/),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "birthDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['child', 'adult']),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "defaultMode", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['mom', 'dad', 'lover', 'teacher', 'bestie']),
    __metadata("design:type", String)
], UpdateUserDto.prototype, "defaultPersona", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], UpdateUserDto.prototype, "consentFlags", void 0);
class AddressDto {
    recipient;
    phone;
    address;
    isDefault;
}
exports.AddressDto = AddressDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AddressDto.prototype, "recipient", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^1\d{10}$/),
    __metadata("design:type", String)
], AddressDto.prototype, "phone", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(120),
    __metadata("design:type", String)
], AddressDto.prototype, "address", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], AddressDto.prototype, "isDefault", void 0);
class BindTicketDto {
    deviceSn;
    model;
    blePublicKey;
}
exports.BindTicketDto = BindTicketDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BindTicketDto.prototype, "deviceSn", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BindTicketDto.prototype, "model", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8),
    __metadata("design:type", String)
], BindTicketDto.prototype, "blePublicKey", void 0);
class BindDeviceDto {
    ticket;
    deviceId;
    bindProof;
}
exports.BindDeviceDto = BindDeviceDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BindDeviceDto.prototype, "ticket", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], BindDeviceDto.prototype, "deviceId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8),
    __metadata("design:type", String)
], BindDeviceDto.prototype, "bindProof", void 0);
class UpdateDeviceDto {
    name;
    defaultMode;
    defaultPersona;
}
exports.UpdateDeviceDto = UpdateDeviceDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateDeviceDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['child', 'adult']),
    __metadata("design:type", String)
], UpdateDeviceDto.prototype, "defaultMode", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['mom', 'dad', 'lover', 'teacher', 'bestie']),
    __metadata("design:type", String)
], UpdateDeviceDto.prototype, "defaultPersona", void 0);
class DeviceCommandDto {
    commandType;
    payload;
    expireInSeconds;
    needAck;
}
exports.DeviceCommandDto = DeviceCommandDto;
__decorate([
    (0, class_validator_1.IsIn)(['heat', 'vibrate', 'heartbeat', 'servo_breath', 'expression', 'led', 'volume', 'sleep_mode']),
    __metadata("design:type", String)
], DeviceCommandDto.prototype, "commandType", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], DeviceCommandDto.prototype, "payload", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(300),
    __metadata("design:type", Number)
], DeviceCommandDto.prototype, "expireInSeconds", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], DeviceCommandDto.prototype, "needAck", void 0);
class SpeechProfileUpdateDto {
    autoDialect;
    fallbackDialect;
    highConfidenceThreshold;
    mediumConfidenceThreshold;
    cloneVoiceId;
    version;
}
exports.SpeechProfileUpdateDto = SpeechProfileUpdateDto;
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], SpeechProfileUpdateDto.prototype, "autoDialect", void 0);
__decorate([
    (0, class_validator_1.IsIn)(contracts_1.DIALECTS),
    __metadata("design:type", String)
], SpeechProfileUpdateDto.prototype, "fallbackDialect", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(.5),
    (0, class_validator_1.Max)(.99),
    __metadata("design:type", Number)
], SpeechProfileUpdateDto.prototype, "highConfidenceThreshold", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(.3),
    (0, class_validator_1.Max)(.95),
    __metadata("design:type", Number)
], SpeechProfileUpdateDto.prototype, "mediumConfidenceThreshold", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], SpeechProfileUpdateDto.prototype, "cloneVoiceId", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], SpeechProfileUpdateDto.prototype, "version", void 0);
class SpeechSessionDto {
    deviceId;
    mode;
    persona;
    wakeModelVersion;
    wakeWord;
}
exports.SpeechSessionDto = SpeechSessionDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SpeechSessionDto.prototype, "deviceId", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['child', 'adult']),
    __metadata("design:type", String)
], SpeechSessionDto.prototype, "mode", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['mom', 'dad', 'lover', 'teacher', 'bestie']),
    __metadata("design:type", String)
], SpeechSessionDto.prototype, "persona", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SpeechSessionDto.prototype, "wakeModelVersion", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['阿西']),
    __metadata("design:type", String)
], SpeechSessionDto.prototype, "wakeWord", void 0);
class DialectRouteDto {
    sessionId;
    dialectCandidate;
    confidence;
    previousDialect;
}
exports.DialectRouteDto = DialectRouteDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DialectRouteDto.prototype, "sessionId", void 0);
__decorate([
    (0, class_validator_1.IsIn)(contracts_1.DIALECTS),
    __metadata("design:type", String)
], DialectRouteDto.prototype, "dialectCandidate", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(1),
    __metadata("design:type", Number)
], DialectRouteDto.prototype, "confidence", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(contracts_1.DIALECTS),
    __metadata("design:type", String)
], DialectRouteDto.prototype, "previousDialect", void 0);
class TtsDto {
    sessionId;
    text;
    dialect;
    voiceId;
    model;
}
exports.TtsDto = TtsDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TtsDto.prototype, "sessionId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], TtsDto.prototype, "text", void 0);
__decorate([
    (0, class_validator_1.IsIn)(contracts_1.DIALECTS),
    __metadata("design:type", String)
], TtsDto.prototype, "dialect", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], TtsDto.prototype, "voiceId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TtsDto.prototype, "model", void 0);
class DialogTextDto {
    deviceId;
    mode;
    persona;
    text;
    conversationId;
    dialect;
}
exports.DialogTextDto = DialogTextDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DialogTextDto.prototype, "deviceId", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['child', 'adult']),
    __metadata("design:type", String)
], DialogTextDto.prototype, "mode", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['mom', 'dad', 'lover', 'teacher', 'bestie']),
    __metadata("design:type", String)
], DialogTextDto.prototype, "persona", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], DialogTextDto.prototype, "text", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DialogTextDto.prototype, "conversationId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(contracts_1.DIALECTS),
    __metadata("design:type", String)
], DialogTextDto.prototype, "dialect", void 0);
class ReminderDto {
    deviceId;
    type;
    title;
    content;
    timeOfDay;
    repeatRule;
    audioAssetId;
    needConfirm;
    enabled;
}
exports.ReminderDto = ReminderDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ReminderDto.prototype, "deviceId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ReminderDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ReminderDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ReminderDto.prototype, "content", void 0);
__decorate([
    (0, class_validator_1.Matches)(/^([01]\d|2[0-3]):[0-5]\d$/),
    __metadata("design:type", String)
], ReminderDto.prototype, "timeOfDay", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ReminderDto.prototype, "repeatRule", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ReminderDto.prototype, "audioAssetId", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ReminderDto.prototype, "needConfirm", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ReminderDto.prototype, "enabled", void 0);
class ReminderPatchDto {
    title;
    content;
    timeOfDay;
    repeatRule;
    needConfirm;
    enabled;
}
exports.ReminderPatchDto = ReminderPatchDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ReminderPatchDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ReminderPatchDto.prototype, "content", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Matches)(/^([01]\d|2[0-3]):[0-5]\d$/),
    __metadata("design:type", String)
], ReminderPatchDto.prototype, "timeOfDay", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ReminderPatchDto.prototype, "repeatRule", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ReminderPatchDto.prototype, "needConfirm", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ReminderPatchDto.prototype, "enabled", void 0);
class ConfirmReminderDto {
    source;
    eventId;
    confirmedAt;
}
exports.ConfirmReminderDto = ConfirmReminderDto;
__decorate([
    (0, class_validator_1.IsIn)(['device', 'app']),
    __metadata("design:type", String)
], ConfirmReminderDto.prototype, "source", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ConfirmReminderDto.prototype, "eventId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ConfirmReminderDto.prototype, "confirmedAt", void 0);
class InvitationDto {
    targetUserId;
    relationType;
    nickname;
}
exports.InvitationDto = InvitationDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], InvitationDto.prototype, "targetUserId", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['couple', 'parent_child', 'bestie']),
    __metadata("design:type", String)
], InvitationDto.prototype, "relationType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], InvitationDto.prototype, "nickname", void 0);
class InvitationDecisionDto {
    nickname;
}
exports.InvitationDecisionDto = InvitationDecisionDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], InvitationDecisionDto.prototype, "nickname", void 0);
class MessageDto {
    relationId;
    receiverDeviceId;
    messageType;
    text;
    audioUrl;
}
exports.MessageDto = MessageDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MessageDto.prototype, "relationId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MessageDto.prototype, "receiverDeviceId", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['text', 'audio']),
    __metadata("design:type", String)
], MessageDto.prototype, "messageType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MessageDto.prototype, "text", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUrl)(),
    __metadata("design:type", String)
], MessageDto.prototype, "audioUrl", void 0);
class CustomQaDto {
    deviceId;
    question;
    answerText;
    answerAudioUrl;
}
exports.CustomQaDto = CustomQaDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CustomQaDto.prototype, "deviceId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CustomQaDto.prototype, "question", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CustomQaDto.prototype, "answerText", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUrl)(),
    __metadata("design:type", String)
], CustomQaDto.prototype, "answerAudioUrl", void 0);
class CustomContentDto {
    deviceId;
    type;
    title;
    audioUrl;
    duration;
}
exports.CustomContentDto = CustomContentDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CustomContentDto.prototype, "deviceId", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['story', 'song']),
    __metadata("design:type", String)
], CustomContentDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CustomContentDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsUrl)(),
    __metadata("design:type", String)
], CustomContentDto.prototype, "audioUrl", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(300),
    __metadata("design:type", Number)
], CustomContentDto.prototype, "duration", void 0);
class ParentControlDto {
    allowedTimeRanges;
    contentSwitches;
    maxVolume;
    dialogRecordEnabled;
    heatingEnabled;
}
exports.ParentControlDto = ParentControlDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], ParentControlDto.prototype, "allowedTimeRanges", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], ParentControlDto.prototype, "contentSwitches", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], ParentControlDto.prototype, "maxVolume", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ParentControlDto.prototype, "dialogRecordEnabled", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ParentControlDto.prototype, "heatingEnabled", void 0);
class PersonaVoiceDto {
    voiceId;
}
exports.PersonaVoiceDto = PersonaVoiceDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", Object)
], PersonaVoiceDto.prototype, "voiceId", void 0);
class VoiceCloneDto {
    sampleUrl;
    consentRecord;
    persona;
}
exports.VoiceCloneDto = VoiceCloneDto;
__decorate([
    (0, class_validator_1.IsUrl)(),
    __metadata("design:type", String)
], VoiceCloneDto.prototype, "sampleUrl", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8),
    __metadata("design:type", String)
], VoiceCloneDto.prototype, "consentRecord", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['mom', 'dad', 'lover', 'teacher', 'bestie']),
    __metadata("design:type", String)
], VoiceCloneDto.prototype, "persona", void 0);
class OrderDto {
    planId;
    billingCycle;
}
exports.OrderDto = OrderDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], OrderDto.prototype, "planId", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['month', 'year']),
    __metadata("design:type", String)
], OrderDto.prototype, "billingCycle", void 0);
class ShopOrderDto {
    productId;
    quantity;
    addressId;
}
exports.ShopOrderDto = ShopOrderDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ShopOrderDto.prototype, "productId", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(10),
    __metadata("design:type", Number)
], ShopOrderDto.prototype, "quantity", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ShopOrderDto.prototype, "addressId", void 0);
class RewardRedeemDto {
    productId;
}
exports.RewardRedeemDto = RewardRedeemDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RewardRedeemDto.prototype, "productId", void 0);
class OtaReportDto {
    jobId;
    status;
    progress;
    errorCode;
}
exports.OtaReportDto = OtaReportDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], OtaReportDto.prototype, "jobId", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['downloading', 'installing', 'succeeded', 'failed', 'rolled_back']),
    __metadata("design:type", String)
], OtaReportDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], OtaReportDto.prototype, "progress", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], OtaReportDto.prototype, "errorCode", void 0);
class OtaPackageDto {
    type;
    version;
    url;
    sha256;
    mandatory;
    compatibleModels;
    rolloutPercent;
}
exports.OtaPackageDto = OtaPackageDto;
__decorate([
    (0, class_validator_1.IsIn)(['firmware', 'expression_pack', 'kids_content', 'wake_words']),
    __metadata("design:type", String)
], OtaPackageDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], OtaPackageDto.prototype, "version", void 0);
__decorate([
    (0, class_validator_1.IsUrl)(),
    __metadata("design:type", String)
], OtaPackageDto.prototype, "url", void 0);
__decorate([
    (0, class_validator_1.Matches)(/^[a-f0-9]{64}$/),
    __metadata("design:type", String)
], OtaPackageDto.prototype, "sha256", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], OtaPackageDto.prototype, "mandatory", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], OtaPackageDto.prototype, "compatibleModels", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], OtaPackageDto.prototype, "rolloutPercent", void 0);
class WakeWordPackageDto {
    type;
    wakeWord;
    modelFamily;
    version;
    url;
    sha256;
    compatibleModels;
    rolloutPercent;
    mandatory;
    rollbackVersion;
}
exports.WakeWordPackageDto = WakeWordPackageDto;
__decorate([
    (0, class_validator_1.IsIn)(['wake_words']),
    __metadata("design:type", String)
], WakeWordPackageDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['阿西']),
    __metadata("design:type", String)
], WakeWordPackageDto.prototype, "wakeWord", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['WakeNet9']),
    __metadata("design:type", String)
], WakeWordPackageDto.prototype, "modelFamily", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], WakeWordPackageDto.prototype, "version", void 0);
__decorate([
    (0, class_validator_1.IsUrl)(),
    __metadata("design:type", String)
], WakeWordPackageDto.prototype, "url", void 0);
__decorate([
    (0, class_validator_1.Matches)(/^[a-f0-9]{64}$/),
    __metadata("design:type", String)
], WakeWordPackageDto.prototype, "sha256", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], WakeWordPackageDto.prototype, "compatibleModels", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], WakeWordPackageDto.prototype, "rolloutPercent", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], WakeWordPackageDto.prototype, "mandatory", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], WakeWordPackageDto.prototype, "rollbackVersion", void 0);
class AdminContentDto {
    type;
    category;
    title;
    text;
    audioUrl;
    duration;
    enabled;
}
exports.AdminContentDto = AdminContentDto;
__decorate([
    (0, class_validator_1.IsIn)(['song', 'story', 'qa']),
    __metadata("design:type", String)
], AdminContentDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AdminContentDto.prototype, "category", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AdminContentDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AdminContentDto.prototype, "text", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUrl)(),
    __metadata("design:type", String)
], AdminContentDto.prototype, "audioUrl", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], AdminContentDto.prototype, "duration", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], AdminContentDto.prototype, "enabled", void 0);
class AuditDecisionDto {
    status;
    reason;
}
exports.AuditDecisionDto = AuditDecisionDto;
__decorate([
    (0, class_validator_1.IsIn)(['approved', 'rejected']),
    __metadata("design:type", String)
], AuditDecisionDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AuditDecisionDto.prototype, "reason", void 0);
class UserStatusDto {
    status;
}
exports.UserStatusDto = UserStatusDto;
__decorate([
    (0, class_validator_1.IsIn)(['active', 'disabled']),
    __metadata("design:type", String)
], UserStatusDto.prototype, "status", void 0);
class PaymentNotifyDto {
    orderNo;
    transactionId;
    tradeState;
    signature;
}
exports.PaymentNotifyDto = PaymentNotifyDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PaymentNotifyDto.prototype, "orderNo", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PaymentNotifyDto.prototype, "transactionId", void 0);
__decorate([
    (0, class_validator_1.IsIn)(['SUCCESS', 'REFUND']),
    __metadata("design:type", String)
], PaymentNotifyDto.prototype, "tradeState", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PaymentNotifyDto.prototype, "signature", void 0);
//# sourceMappingURL=dto.js.map