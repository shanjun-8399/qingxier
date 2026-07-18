import { createPinia,setActivePinia } from 'pinia';
import { setTransport } from '@/services/http';
import { useAuthStore } from '@/stores/auth';
import { useDeviceStore } from '@/stores/device';
import { useAppStore } from '@/stores/app';
function transport(){return{request:async(o:any)=>{const path=o.url.replace('https://api.qingxier.com','');let data:any={};if(path.includes('wechat-login'))data={accessToken:'a',refreshToken:'r',user:{id:'u',nickname:'庆喜'}};else if(path==='/api/v1/users/me')data={id:'u',nickname:'庆喜'};else if(path==='/api/v1/devices')data=[{deviceId:'d1',name:'设备'}];else if(path.includes('/status'))data={deviceId:'d1',online:true,batteryPercent:80};else if(path==='/api/v1/reminders')data=[];else if(path==='/api/v1/relations')data=[];else if(path==='/api/v1/messages')data=[];else if(path==='/api/v1/tasks/today')data=[];else if(path==='/api/v1/rewards/balance')data={balance:7};return{statusCode:200,data:{code:0,message:'OK',data,traceId:'t'}}}}}
describe('pinia stores',()=>{beforeEach(()=>{setActivePinia(createPinia());setTransport(transport() as any)});
 it('logs in, restores and logs out',async()=>{const s=useAuthStore();s.restore();expect(s.ready).toBe(true);await s.login('code');expect(s.user.nickname).toBe('庆喜');expect(s.loggedIn).toBe(true);s.logout();expect(s.user).toBeNull()});
 it('loads device and refreshes status',async()=>{const s=useDeviceStore();await s.load();expect(s.currentId).toBe('d1');expect(s.status.batteryPercent).toBe(80);s.select('d1');await s.refreshStatus();await s.rename('新名称');expect(s.loading).toBe(false)});
 it('loads dashboard domains together',async()=>{const s=useAppStore();await s.loadDashboard();expect(s.balance).toBe(7);expect(s.tasks).toEqual([])});
});
