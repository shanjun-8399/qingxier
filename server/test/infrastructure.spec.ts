import { AppConfig } from '@/config/app-config';import { MemoryDataStore } from '@/infrastructure/data-store';import { MockAiProviders, MemoryEventBus } from '@/infrastructure/integrations';
describe('infrastructure',()=>{
 it('config validates defaults',()=>expect(()=>new AppConfig().validate()).not.toThrow());
 it('memory store CRUD',async()=>{const db=new MemoryDataStore();const x={id:'x',createdAt:'1',updatedAt:'1',value:1};await db.insert('auditLogs',x);expect((await db.get<any>('auditLogs','x')).value).toBe(1);expect((await db.patch<any>('auditLogs','x',{value:2})).value).toBe(2);expect(await db.remove('auditLogs','x')).toBe(true)});
 it('mock ASR/TTS/chat/audit',async()=>{const a=new MockAiProviders();expect((await a.recognize('')).confidence).toBeGreaterThan(.9);expect((await a.synthesize({text:'你好',dialect:'mandarin',model:'m'})).audioUrl).toContain('m');expect(await a.chat({text:'hi',persona:'mom',mode:'adult',memories:[]})).toContain('hi');expect((await a.audit({type:'text',content:'色情'})).status).toBe('rejected')});
 it('memory events retain payload',async()=>{const e=new MemoryEventBus();await e.publish('a',{x:1});expect(e.events()).toEqual([{topic:'a',payload:{x:1}}])});
});
