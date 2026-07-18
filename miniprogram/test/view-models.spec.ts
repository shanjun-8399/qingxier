import { deviceSummary,dialectLabels,speechNotice,subscriptionUsage,unreadCount,validateReminder } from '@/view-models';
describe('miniapp view models',()=>{
 it('formats device status',()=>expect(deviceSummary({online:true,batteryPercent:86,currentMode:'child',currentPersona:'mom'})).toEqual({onlineText:'在线',batteryText:'86%',modeText:'幼儿版',personaText:'妈妈'}));
 it('handles empty device status',()=>expect(deviceSummary(null).batteryText).toBe('0%'));
 it('validates reminder form',()=>{expect(validateReminder({title:'',timeOfDay:'x',content:''})).toHaveLength(3);expect(validateReminder({title:'喝水',timeOfDay:'15:30',content:'喝水'})).toEqual([])});
 it('creates automatic dialect notices',()=>{expect(speechNotice({confidence:.9,source:'asr',dialect:'cantonese'})).toContain('粤语');expect(speechNotice({confidence:.2,source:'fallback',dialect:'mandarin'})).toContain('置信度');expect(speechNotice({confidence:.9,source:'asr',dialect:'wu',degraded:true,fallbackReason:'映射上海话'})).toBe('映射上海话')});
 it('computes subscription usage and unread messages',()=>{expect(subscriptionUsage({limits:{customQas:50}},{customQas:25})[0].percent).toBe(50);expect(unreadCount([{deliveryStatus:'read'},{deliveryStatus:'delivered'}])).toBe(1);expect(dialectLabels.minnan).toBe('闽南语')});
});
