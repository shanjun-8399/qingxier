import type { ApiEnvelope, ApiErrorEnvelope } from '@qingxier/contracts';
import { tokenStorage } from './storage';
export type HttpMethod='GET'|'POST'|'PUT'|'PATCH'|'DELETE';
export interface RequestOptions { url:string; method?:HttpMethod; data?:any; header?:Record<string,string>; }
export interface Transport { request(options:RequestOptions):Promise<{statusCode:number;data:any;header?:Record<string,string>}>; }
const uniTransport:Transport={request(options){return new Promise((resolve,reject)=>uni.request({...options,method:options.method as any,success:r=>resolve(r as any),fail:reject}))}};
let transport:Transport=uniTransport;
export const setTransport=(value:Transport)=>{transport=value};
export class ApiClient {
  constructor(private readonly baseUrl:string='https://api.qingxier.com'){}
  async request<T>(path:string,options:Omit<RequestOptions,'url'>={}):Promise<T>{
    const token=tokenStorage.access();
    const response=await transport.request({url:`${this.baseUrl}${path}`,method:options.method??'GET',data:options.data,header:{'Content-Type':'application/json','X-Request-Id':`mp_${Date.now()}`,...(token?{Authorization:`Bearer ${token}`}:{ }),...options.header}});
    const body=response.data as ApiEnvelope<T>|ApiErrorEnvelope;
    if(response.statusCode<200||response.statusCode>=300||body.code!==0){const e=new Error(body.message||'请求失败') as Error&{code?:number;traceId?:string;error?:string};e.code=body.code;e.traceId=body.traceId;e.error='error'in body?body.error:undefined;throw e;}
    return (body as ApiEnvelope<T>).data;
  }
}
export const apiClient=new ApiClient(import.meta.env.VITE_API_BASE_URL||'https://api.qingxier.com');
