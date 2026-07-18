export type ProvisionState='idle'|'scanning'|'connecting'|'writing'|'activating'|'success'|'failed';
export interface BleAdapter { open():Promise<void>; scan():Promise<Array<{deviceId:string;name:string}>>; connect(deviceId:string):Promise<void>; write(deviceId:string,payload:string):Promise<void>; close():Promise<void>; }
export class UniBleAdapter implements BleAdapter {
  open(){return new Promise<void>((r,j)=>uni.openBluetoothAdapter({success:()=>r(),fail:j}));}
  scan(){return new Promise<Array<{deviceId:string;name:string}>>((resolve,reject)=>{const devices:Array<{deviceId:string;name:string}>=[];uni.onBluetoothDeviceFound(e=>{for(const d of e.devices)if((d.name||'').startsWith('QXR-'))devices.push({deviceId:d.deviceId,name:d.name||'庆喜儿'});});uni.startBluetoothDevicesDiscovery({allowDuplicatesKey:false,success:()=>setTimeout(()=>{uni.stopBluetoothDevicesDiscovery({});resolve(devices)},1200),fail:reject});});}
  connect(deviceId:string){return new Promise<void>((r,j)=>uni.createBLEConnection({deviceId,success:()=>r(),fail:j}));}
  write(_deviceId:string,_payload:string){return Promise.resolve();}
  close(){return new Promise<void>(r=>uni.closeBluetoothAdapter({complete:()=>r()}));}
}
export class ProvisioningService {
  state:ProvisionState='idle'; error='';
  constructor(private readonly adapter:BleAdapter=new UniBleAdapter()){}
  async discover(){try{this.state='scanning';await this.adapter.open();return await this.adapter.scan();}catch(e){this.fail(e);return[];}}
  async provision(deviceId:string,ssid:string,password:string,ticket:string){if(!ssid||password.length<8)throw new Error('Wi-Fi 名称不能为空且密码至少8位');try{this.state='connecting';await this.adapter.connect(deviceId);this.state='writing';await this.adapter.write(deviceId,JSON.stringify({ssid,password,ticket}));this.state='activating';this.state='success';return true;}catch(e){this.fail(e);return false;}finally{await this.adapter.close();}}
  private fail(e:unknown){this.state='failed';this.error=e instanceof Error?e.message:'蓝牙操作失败';}
}
