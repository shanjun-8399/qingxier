import { defineStore } from 'pinia';
import { qingxierApi } from '@/services/api';
import { tokenStorage } from '@/services/storage';
export const useAuthStore=defineStore('auth',{state:()=>({user:null as any|null,ready:false}),getters:{loggedIn:s=>Boolean(s.user&&tokenStorage.access())},actions:{restore(){this.ready=true;},async login(code:string){const r=await qingxierApi.login(code);tokenStorage.save(r.accessToken,r.refreshToken);this.user=r.user;this.ready=true;return r;},async load(){this.user=await qingxierApi.me();this.ready=true;},logout(){tokenStorage.clear();this.user=null;this.ready=true;uni.reLaunch({url:'/pages/login/index'});}}});
