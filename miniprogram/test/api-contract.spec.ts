import { qingxierApi } from '@/services/api';
import { apiClient } from '@/services/http';

describe('miniapp API contract wrappers', () => {
  it('maps every feature function to the V2 server contract', async () => {
    const spy = vi.spyOn(apiClient, 'request').mockResolvedValue({} as never);
    const calls: Array<() => Promise<unknown>> = [
      () => qingxierApi.login('code'),
      () => qingxierApi.me(),
      () => qingxierApi.updateMe({ nickname: '庆喜' }),
      () => qingxierApi.devices(),
      () => qingxierApi.deviceStatus('d/1'),
      () => qingxierApi.updateDevice('d1', { name: '新名称' }),
      () => qingxierApi.bindTicket({ deviceSn: 'SN' }),
      () => qingxierApi.bindDevice({ ticket: 'T' }),
      () => qingxierApi.command('d1', { commandType: 'heat' }),
      () => qingxierApi.capabilities(),
      () => qingxierApi.speechProfile('d1'),
      () => qingxierApi.updateSpeechProfile('d1', { version: 1 }),
      () => qingxierApi.wakeStatus('d1'),
      () => qingxierApi.reminders(),
      () => qingxierApi.createReminder({ title: '喝水' }),
      () => qingxierApi.updateReminder('r1', { enabled: false }),
      () => qingxierApi.deleteReminder('r1'),
      () => qingxierApi.relations(),
      () => qingxierApi.invitations(),
      () => qingxierApi.invite({ targetUserId: 'u2' }),
      () => qingxierApi.acceptInvite('rel/1'),
      () => qingxierApi.messages(),
      () => qingxierApi.sendMessage({ text: '晚安' }),
      () => qingxierApi.readMessage('m1'),
      () => qingxierApi.tasks(),
      () => qingxierApi.claimTask('t/1'),
      () => qingxierApi.balance(),
      () => qingxierApi.rewardCatalog(),
      () => qingxierApi.parentControl('d1'),
      () => qingxierApi.updateParentControl('d1', { maxVolume: 60 }),
      () => qingxierApi.sleepMode('d1'),
      () => qingxierApi.customQas(),
      () => qingxierApi.addQa({ question: '生日' }),
      () => qingxierApi.customContents(),
      () => qingxierApi.addContent({ title: '故事' }),
      () => qingxierApi.kidsCategories(),
      () => qingxierApi.kidsContent(),
      () => qingxierApi.kidsContent('睡前 故事'),
      () => qingxierApi.personas(),
      () => qingxierApi.voiceClones(),
      () => qingxierApi.createVoiceClone({ sampleUrl: 'u' }),
      () => qingxierApi.setPersonaVoice('mom', 'voice1'),
      () => qingxierApi.plans(),
      () => qingxierApi.subscription(),
      () => qingxierApi.createOrder({ planId: 'basic' }),
      () => qingxierApi.orders(),
      () => qingxierApi.products(),
      () => qingxierApi.createShopOrder({ productId: 'p1' }),
      () => qingxierApi.mood(),
      () => qingxierApi.dialogs(),
      () => qingxierApi.dialog({ text: '你好' })
    ];
    for (const call of calls) await call();
    expect(spy).toHaveBeenCalledTimes(calls.length);
    expect(spy).toHaveBeenCalledWith('/api/v1/auth/wechat-login', expect.objectContaining({ method: 'POST' }));
    expect(spy).toHaveBeenCalledWith('/api/v1/devices/d%2F1/status');
    expect(spy).toHaveBeenCalledWith('/api/v1/relations/invitations/rel%2F1/accept', expect.objectContaining({ method: 'POST' }));
    expect(spy).toHaveBeenCalledWith('/api/v1/kids/content?category=%E7%9D%A1%E5%89%8D%20%E6%95%85%E4%BA%8B');
    expect(spy).toHaveBeenCalledWith('/api/v1/dialogs/text', expect.objectContaining({ method: 'POST' }));
  });
});
