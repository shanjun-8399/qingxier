import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createApplication } from '@/bootstrap';
export const USER={Authorization:'Bearer user-token'};export const USER2={Authorization:'Bearer user-token-2'};export const DEVICE={'X-Device-Token':'device-token'};export const ADMIN={Authorization:'Bearer admin-token','X-MFA-Verified':'true'};
export async function app(){process.env.APP_ENV='test';process.env.AUTH_MODE='static';process.env.STORAGE_BACKEND='memory';process.env.EVENT_BACKEND='memory';process.env.PROVIDER_MODE='mock';const a=await createApplication();await a.init();return a}
export const data=(r:any)=>r.body.data;
export async function session(a:INestApplication){const r=await request(a.getHttpServer()).post('/api/v1/speech/sessions').set(DEVICE).send({deviceId:'d_001',mode:'adult',persona:'mom',wakeModelVersion:'wakenet9-axi-1.0.0',wakeWord:'阿西'}).expect(201);return data(r)}
