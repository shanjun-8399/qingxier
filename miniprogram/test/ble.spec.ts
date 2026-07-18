import { ProvisioningService,type BleAdapter } from '@/services/ble';
const adapter=(overrides:Partial<BleAdapter>={}):BleAdapter=>({open:async()=>{},scan:async()=>[{deviceId:'d',name:'QXR'}],connect:async()=>{},write:async()=>{},close:async()=>{},...overrides});
describe('BLE provisioning',()=>{
 it('discovers devices and provisions Wi-Fi',async()=>{const s=new ProvisioningService(adapter());expect(await s.discover()).toHaveLength(1);expect(s.state).toBe('scanning');await expect(s.provision('d','wifi','12345678','t')).resolves.toBe(true);expect(s.state).toBe('success')});
 it('validates Wi-Fi credentials',async()=>{await expect(new ProvisioningService(adapter()).provision('d','','1','t')).rejects.toThrow('至少8位')});
 it('records scan and write failures',async()=>{const scan=new ProvisioningService(adapter({open:async()=>{throw new Error('蓝牙关闭')}}));expect(await scan.discover()).toEqual([]);expect(scan.state).toBe('failed');const write=new ProvisioningService(adapter({write:async()=>{throw new Error('写入失败')}}));expect(await write.provision('d','wifi','12345678','t')).toBe(false);expect(write.error).toBe('写入失败')});
});
