import { Body, Controller, Delete, Get, Headers, HttpCode, Param, Patch, Post, Query, Req, ServiceUnavailableException } from '@nestjs/common';
import type { Request } from 'express';
import { CurrentPrincipal, Public, RequireMfa, Roles } from '@/common/auth';
import type { Principal } from '@/domain/types';
import { PlatformService } from '@/application/platform.service';
import { SpeechService } from '@/application/speech.service';
import * as D from './dto';

@Controller()
export class HealthController {
  constructor(private readonly platform: PlatformService) {}
  @Public() @Get('/health') health() { return this.platform.health(); }
  @Public() @Get('/ready') async ready() { const x = await this.platform.ready(); if (x.status !== 'ready') throw new ServiceUnavailableException('服务尚未就绪'); return x; }
}

@Controller('/api/v1')
export class UserController {
  constructor(private readonly p: PlatformService) {}
  @Public() @Post('auth/wechat-login') @HttpCode(200) login(@Body() b: D.WechatLoginDto) { return this.p.login(b); }
  @Public() @Post('auth/refresh') @HttpCode(200) refresh(@Body() b: D.RefreshDto) { return this.p.refresh(b); }
  @Roles('user') @Post('auth/phone-bind') @HttpCode(200) phone(@CurrentPrincipal() q: Principal, @Body() b: D.PhoneBindDto) { return this.p.bindPhone(q, b); }
  @Roles('user') @Get('users/me') me(@CurrentPrincipal() q: Principal) { return this.p.me(q); }
  @Roles('user') @Patch('users/me') update(@CurrentPrincipal() q: Principal, @Body() b: D.UpdateUserDto) { return this.p.updateMe(q, b); }
  @Roles('user') @Get('users/me/export') export(@CurrentPrincipal() q: Principal) { return this.p.exportMe(q); }
  @Roles('user') @Delete('users/me') remove(@CurrentPrincipal() q: Principal) { return this.p.deleteMe(q); }
  @Roles('user') @Get('users/me/addresses') addresses(@CurrentPrincipal() q: Principal) { return this.p.addresses(q); }
  @Roles('user') @Post('users/me/addresses') addAddress(@CurrentPrincipal() q: Principal, @Body() b: D.AddressDto) { return this.p.addAddress(q, b); }
  @Roles('user') @Patch('users/me/addresses/:id') patchAddress(@CurrentPrincipal() q: Principal, @Param('id') id: string, @Body() b: D.AddressDto) { return this.p.patchAddress(q, id, b); }
  @Roles('user') @Delete('users/me/addresses/:id') deleteAddress(@CurrentPrincipal() q: Principal, @Param('id') id: string) { return this.p.deleteAddress(q, id); }
}

@Controller('/api/v1')
export class DeviceSpeechController {
  constructor(private readonly p: PlatformService, private readonly s: SpeechService) {}
  @Roles('user') @Post('devices/bind-ticket') bindTicket(@CurrentPrincipal() q: Principal, @Body() b: D.BindTicketDto) { return this.p.bindTicket(q, b); }
  @Roles('user') @Post('devices/bind') bind(@CurrentPrincipal() q: Principal, @Body() b: D.BindDeviceDto) { return this.p.bindDevice(q, b); }
  @Roles('user') @Get('devices') devices(@CurrentPrincipal() q: Principal) { return this.p.devices(q); }
  @Roles('user') @Get('devices/:id/status') status(@CurrentPrincipal() q: Principal, @Param('id') id: string) { return this.p.deviceStatus(q, id); }
  @Roles('user') @Patch('devices/:id') update(@CurrentPrincipal() q: Principal, @Param('id') id: string, @Body() b: D.UpdateDeviceDto) { return this.p.updateDevice(q, id, b); }
  @Roles('user') @Delete('devices/:id/binding') unbind(@CurrentPrincipal() q: Principal, @Param('id') id: string) { return this.p.unbind(q, id); }
  @Roles('user') @Post('devices/:id/commands') @HttpCode(200) command(@CurrentPrincipal() q: Principal, @Param('id') id: string, @Body() b: D.DeviceCommandDto, @Req() r: Request & { traceId?: string }) { return this.p.command(q, id, b, r.traceId ?? ''); }
  @Roles('user') @Get('speech/capabilities') capabilities() { return this.s.capabilities(); }
  @Roles('user') @Get('devices/:id/speech-profile') profile(@CurrentPrincipal() q: Principal, @Param('id') id: string) { return this.s.profile(q, id); }
  @Roles('user') @Patch('devices/:id/speech-profile') patchProfile(@CurrentPrincipal() q: Principal, @Param('id') id: string, @Body() b: D.SpeechProfileUpdateDto, @Req() r: Request & { traceId?: string }) { return this.s.updateProfile(q, id, b, r.traceId ?? ''); }
  @Roles('user') @Get('devices/:id/wake-word/status') wake(@CurrentPrincipal() q: Principal, @Param('id') id: string) { return this.s.wakeStatus(q, id); }
  @Roles('device') @Post('speech/sessions') session(@CurrentPrincipal() q: Principal, @Body() b: D.SpeechSessionDto) { return this.s.createSession(q, b); }
  @Roles('device') @Post('speech/route') @HttpCode(200) route(@CurrentPrincipal() q: Principal, @Body() b: D.DialectRouteDto) { return this.s.route(q, b); }
  @Roles('device') @Post('speech/tts') @HttpCode(200) tts(@CurrentPrincipal() q: Principal, @Body() b: D.TtsDto, @Req() r: Request & { traceId?: string }) { return this.s.tts(q, b, r.traceId ?? ''); }
  @Roles('user','device') @Get('devices/:id/ota/check') ota(@CurrentPrincipal() q: Principal, @Param('id') id: string, @Query('currentFirmware') v?: string) { return this.p.otaCheck(q, id, v); }
  @Roles('device') @Post('device/ota/report') @HttpCode(200) report(@CurrentPrincipal() q: Principal, @Body() b: D.OtaReportDto) { return this.p.otaReport(q, b); }
  @Roles('admin') @Get('admin/wake-word-packages') wakePackages() { return this.s.wakePackages(); }
  @Roles('admin') @RequireMfa() @Post('admin/wake-word-packages') wakePackage(@CurrentPrincipal() q: Principal, @Body() b: D.WakeWordPackageDto, @Headers('idempotency-key') key: string | undefined, @Req() r: Request & { traceId?: string }) { return this.s.registerWake(q, b, key, r.traceId ?? ''); }
}

@Controller('/api/v1')
export class InteractionController {
  constructor(private readonly p: PlatformService, private readonly s: SpeechService) {}
  @Roles('user') @Post('dialogs/text') @HttpCode(200) dialog(@CurrentPrincipal() q: Principal, @Body() b: D.DialogTextDto, @Req() r: Request & { traceId?: string }) { return this.s.dialog(q, b, r.traceId ?? ''); }
  @Roles('user') @Get('dialogs') dialogs(@CurrentPrincipal() q: Principal, @Query('deviceId') d?: string) { return this.s.dialogs(q, d); }
  @Roles('user') @Get('dialogs/:id/turns') turns(@CurrentPrincipal() q: Principal, @Param('id') id: string) { return this.s.turns(q, id); }
  @Roles('user') @Get('mood-reports/weekly') mood(@CurrentPrincipal() q: Principal) { return this.p.mood(q); }
  @Roles('user') @Get('reminders') reminders(@CurrentPrincipal() q: Principal) { return this.p.reminders(q); }
  @Roles('user') @Post('reminders') addReminder(@CurrentPrincipal() q: Principal, @Body() b: D.ReminderDto) { return this.p.addReminder(q, b); }
  @Roles('user') @Patch('reminders/:id') patchReminder(@CurrentPrincipal() q: Principal, @Param('id') id: string, @Body() b: D.ReminderPatchDto) { return this.p.patchReminder(q, id, b); }
  @Roles('user') @Delete('reminders/:id') deleteReminder(@CurrentPrincipal() q: Principal, @Param('id') id: string) { return this.p.deleteReminder(q, id); }
  @Roles('user') @Post('reminders/:id/confirm') @HttpCode(200) confirmReminder(@CurrentPrincipal() q: Principal, @Param('id') id: string, @Body() b: D.ConfirmReminderDto) { return this.p.confirmReminder(q, id, b); }
  @Roles('user') @Get('reminders/:id/events') reminderEvents(@CurrentPrincipal() q: Principal, @Param('id') id: string) { return this.p.reminderEvents(q, id); }
}

@Controller('/api/v1')
export class SocialContentController {
  constructor(private readonly p: PlatformService) {}
  @Roles('user') @Get('relations/invitations') invitations(@CurrentPrincipal() q: Principal) { return this.p.invitations(q); }
  @Roles('user') @Post('relations/invitations') invite(@CurrentPrincipal() q: Principal, @Body() b: D.InvitationDto) { return this.p.invite(q, b); }
  @Roles('user') @Post('relations/invitations/:id/accept') @HttpCode(200) accept(@CurrentPrincipal() q: Principal, @Param('id') id: string, @Body() b: D.InvitationDecisionDto) { return this.p.decideInvitation(q, id, true, b); }
  @Roles('user') @Post('relations/invitations/:id/reject') @HttpCode(200) reject(@CurrentPrincipal() q: Principal, @Param('id') id: string, @Body() b: D.InvitationDecisionDto) { return this.p.decideInvitation(q, id, false, b); }
  @Roles('user') @Get('relations') relations(@CurrentPrincipal() q: Principal) { return this.p.relations(q); }
  @Roles('user') @Delete('relations/:id') deleteRelation(@CurrentPrincipal() q: Principal, @Param('id') id: string) { return this.p.deleteRelation(q, id); }
  @Roles('user') @Get('messages') messages(@CurrentPrincipal() q: Principal) { return this.p.messages(q); }
  @Roles('user') @Post('messages') message(@CurrentPrincipal() q: Principal, @Body() b: D.MessageDto) { return this.p.sendMessage(q, b); }
  @Roles('user') @Post('messages/:id/read') @HttpCode(200) read(@CurrentPrincipal() q: Principal, @Param('id') id: string) { return this.p.readMessage(q, id); }
  @Roles('user') @Get('kids/content/categories') categories() { return this.p.categories(); }
  @Roles('user') @Get('kids/content') content(@Query('category') c?: string) { return this.p.kidsContent(c); }
  @Roles('user') @Get('custom-qas') qas(@CurrentPrincipal() q: Principal) { return this.p.qas(q); }
  @Roles('user') @Post('custom-qas') addQa(@CurrentPrincipal() q: Principal, @Body() b: D.CustomQaDto) { return this.p.addQa(q, b); }
  @Roles('user') @Patch('custom-qas/:id') patchQa(@CurrentPrincipal() q: Principal, @Param('id') id: string, @Body() b: D.CustomQaDto) { return this.p.patchQa(q, id, b); }
  @Roles('user') @Delete('custom-qas/:id') deleteQa(@CurrentPrincipal() q: Principal, @Param('id') id: string) { return this.p.deleteQa(q, id); }
  @Roles('user') @Post('custom-contents/upload-token') @HttpCode(200) upload(@CurrentPrincipal() q: Principal) { return this.p.uploadToken(q, 'custom-content'); }
  @Roles('user') @Get('custom-contents') custom(@CurrentPrincipal() q: Principal) { return this.p.customContents(q); }
  @Roles('user') @Post('custom-contents') addCustom(@CurrentPrincipal() q: Principal, @Body() b: D.CustomContentDto) { return this.p.addCustomContent(q, b); }
  @Roles('user') @Delete('custom-contents/:id') deleteCustom(@CurrentPrincipal() q: Principal, @Param('id') id: string) { return this.p.deleteCustomContent(q, id); }
  @Roles('user') @Get('parent-controls/:id') parent(@CurrentPrincipal() q: Principal, @Param('id') id: string) { return this.p.parentControl(q, id); }
  @Roles('user') @Patch('parent-controls/:id') patchParent(@CurrentPrincipal() q: Principal, @Param('id') id: string, @Body() b: D.ParentControlDto, @Req() r: Request & { traceId?: string }) { return this.p.updateParentControl(q, id, b, r.traceId ?? ''); }
  @Roles('user') @Get('parent-controls/:id/dialog-records') records(@CurrentPrincipal() q: Principal, @Param('id') id: string) { return this.p.parentRecords(q, id); }
  @Roles('user') @Post('parent-controls/:id/sleep-mode') @HttpCode(200) sleep(@CurrentPrincipal() q: Principal, @Param('id') id: string, @Req() r: Request & { traceId?: string }) { return this.p.sleepMode(q, id, r.traceId ?? ''); }
  @Roles('user') @Get('personas') personas() { return this.p.personas(); }
  @Roles('user') @Patch('personas/:persona/voice') personaVoice(@CurrentPrincipal() q: Principal, @Param('persona') persona: string, @Body() b: D.PersonaVoiceDto) { return this.p.setPersonaVoice(q, persona, b); }
  @Roles('user') @Post('voice-clones/upload-token') @HttpCode(200) voiceUpload(@CurrentPrincipal() q: Principal) { return this.p.uploadToken(q, 'voice-clone'); }
  @Roles('user') @Get('voice-clones') voices(@CurrentPrincipal() q: Principal) { return this.p.voiceClones(q); }
  @Roles('user') @Post('voice-clones') addVoice(@CurrentPrincipal() q: Principal, @Body() b: D.VoiceCloneDto) { return this.p.addVoiceClone(q, b); }
  @Roles('user') @Get('voice-clones/:id') voice(@CurrentPrincipal() q: Principal, @Param('id') id: string) { return this.p.voiceClone(q, id); }
  @Roles('user') @Delete('voice-clones/:id') deleteVoice(@CurrentPrincipal() q: Principal, @Param('id') id: string) { return this.p.deleteVoiceClone(q, id); }
}

@Controller('/api/v1')
export class CommerceController {
  constructor(private readonly p: PlatformService) {}
  @Roles('user') @Get('tasks/today') tasks(@CurrentPrincipal() q: Principal) { return this.p.tasks(q); }
  @Roles('user') @Post('tasks/:id/claim') @HttpCode(200) claim(@CurrentPrincipal() q: Principal, @Param('id') id: string) { return this.p.claimTask(q, id); }
  @Roles('user') @Get('rewards/balance') balance(@CurrentPrincipal() q: Principal) { return this.p.rewardBalance(q); }
  @Roles('user') @Get('rewards/catalog') catalog() { return this.p.rewardCatalog(); }
  @Roles('user') @Post('rewards/redeem') @HttpCode(200) redeem(@CurrentPrincipal() q: Principal, @Body() b: D.RewardRedeemDto) { return this.p.redeem(q, b); }
  @Roles('user') @Get('subscription/plans') plans() { return this.p.plans(); }
  @Roles('user') @Get('subscription/current') subscription(@CurrentPrincipal() q: Principal) { return this.p.currentSubscription(q); }
  @Roles('user') @Post('subscription/cancel-renewal') @HttpCode(200) cancel(@CurrentPrincipal() q: Principal) { return this.p.cancelRenewal(q); }
  @Roles('user') @Get('orders') orders(@CurrentPrincipal() q: Principal) { return this.p.orders(q); }
  @Roles('user') @Post('orders') order(@CurrentPrincipal() q: Principal, @Body() b: D.OrderDto) { return this.p.createOrder(q, b); }
  @Public() @Post('payments/wechat/notify') @HttpCode(200) payment(@Body() b: D.PaymentNotifyDto) { return this.p.payment(b); }
  @Roles('user') @Get('shop/products') products() { return this.p.products(); }
  @Roles('user') @Get('shop/orders') shopOrders(@CurrentPrincipal() q: Principal) { return this.p.shopOrders(q); }
  @Roles('user') @Post('shop/orders') shopOrder(@CurrentPrincipal() q: Principal, @Body() b: D.ShopOrderDto) { return this.p.shopOrder(q, b); }
}

@Controller('/api/v1/admin')
@Roles('admin')
export class AdminController {
  constructor(private readonly p: PlatformService, private readonly s: SpeechService) {}
  @Get('dashboard') dashboard() { return this.p.dashboard(); }
  @Get('users') users() { return this.p.adminUsers(); }
  @RequireMfa() @Patch('users/:id/status') userStatus(@CurrentPrincipal() q: Principal, @Param('id') id: string, @Body() b: D.UserStatusDto, @Req() r: Request & { traceId?: string }) { return this.p.userStatus(q, id, b, r.traceId ?? ''); }
  @Get('devices') devices() { return this.p.adminDevices(); }
  @Get('orders') orders() { return this.p.adminOrders(); }
  @Get('content-library') content() { return this.p.adminContent(); }
  @RequireMfa() @Post('content-library') addContent(@CurrentPrincipal() q: Principal, @Body() b: D.AdminContentDto, @Req() r: Request & { traceId?: string }) { return this.p.addAdminContent(q, b, r.traceId ?? ''); }
  @RequireMfa() @Patch('content-library/:id') patchContent(@CurrentPrincipal() q: Principal, @Param('id') id: string, @Body() b: D.AdminContentDto, @Req() r: Request & { traceId?: string }) { return this.p.patchAdminContent(q, id, b, r.traceId ?? ''); }
  @RequireMfa() @Delete('content-library/:id') deleteContent(@CurrentPrincipal() q: Principal, @Param('id') id: string, @Req() r: Request & { traceId?: string }) { return this.p.deleteAdminContent(q, id, r.traceId ?? ''); }
  @Get('content-audits') audits() { return this.p.contentAudits(); }
  @RequireMfa() @Patch('content-audits/:id') audit(@CurrentPrincipal() q: Principal, @Param('id') id: string, @Body() b: D.AuditDecisionDto, @Req() r: Request & { traceId?: string }) { return this.p.decideAudit(q, id, b, r.traceId ?? ''); }
  @Get('ota-packages') ota() { return this.p.otaPackages(); }
  @RequireMfa() @Post('ota-packages') addOta(@CurrentPrincipal() q: Principal, @Body() b: D.OtaPackageDto, @Req() r: Request & { traceId?: string }) { return this.p.addOta(q, b, r.traceId ?? ''); }
  @Get('expression-packs') expressions() { return this.p.expressionPacks(); }
  @RequireMfa() @Post('expression-packs') addExpression(@CurrentPrincipal() q: Principal, @Body() b: any, @Req() r: Request & { traceId?: string }) { return this.p.addExpression(q, b, r.traceId ?? ''); }
  @Get('voice-clones') voices() { return this.p.adminVoiceClones(); }
  @Get('speech/metrics') metrics() { return this.s.metrics(); }
  @Get('audit-logs') logs() { return this.p.auditLogs(); }
  @Get('events') events() { return this.p.adminEvents(); }
}

@Controller('/api/v1/webhooks')
export class WebhookController {
  constructor(private readonly p: PlatformService) {}
  @Public() @Post('voice-clone/:provider') @HttpCode(200) voice(@Param('provider') provider: string, @Body() b: any) { return this.p.voiceWebhook(provider, b); }
  @Public() @Post('content-audit/:provider') @HttpCode(200) content(@Param('provider') provider: string, @Body() body: any) { return { provider, received: true, body }; }
  @Public() @Post('cos/events') @HttpCode(200) cos(@Body() body: any) { return { received: true, event: body.event ?? 'unknown' }; }
}
