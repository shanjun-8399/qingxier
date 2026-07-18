import { ApiClient,setTransport,type Transport } from '@/services/http';
import { tokenStorage } from '@/services/storage';
describe('miniapp http client',()=>{
 it('adds bearer token and unwraps envelope',async()=>{tokenStorage.save('access','refresh');let seen:any;setTransport({request:async o=>{seen=o;return{statusCode:200,data:{code:0,message:'OK',data:{ok:true},traceId:'t'}}}} as Transport);expect(await new ApiClient('https://api').request('/x')).toEqual({ok:true});expect(seen.header.Authorization).toBe('Bearer access');expect(seen.header['X-Request-Id']).toMatch(/^mp_/)});
 it('supports body/method/custom headers',async()=>{let seen:any;setTransport({request:async o=>{seen=o;return{statusCode:201,data:{code:0,message:'OK',data:1,traceId:'t'}}}});expect(await new ApiClient('https://a').request('/x',{method:'POST',data:{x:1},header:{A:'B'}})).toBe(1);expect(seen).toMatchObject({url:'https://a/x',method:'POST',data:{x:1}});expect(seen.header.A).toBe('B')});
 it('throws structured API errors',async()=>{setTransport({request:async()=>({statusCode:409,data:{code:409001,message:'冲突',error:'CONFLICT',traceId:'trc'}})});await expect(new ApiClient().request('/x')).rejects.toMatchObject({message:'冲突',code:409001,error:'CONFLICT',traceId:'trc'})});
 it('throws on nonzero code even with HTTP 200',async()=>{setTransport({request:async()=>({statusCode:200,data:{code:700001,message:'超限',error:'SUBSCRIPTION_LIMIT',traceId:'t'}})});await expect(new ApiClient().request('/x')).rejects.toThrow('超限')});
});
