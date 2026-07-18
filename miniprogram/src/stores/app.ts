import { defineStore } from 'pinia';
import { qingxierApi } from '@/services/api';
export const useAppStore=defineStore('app',{state:()=>({reminders:[] as any[],relations:[] as any[],messages:[] as any[],tasks:[] as any[],balance:0}),actions:{async loadDashboard(){const [reminders,relations,messages,tasks,balance]=await Promise.all([qingxierApi.reminders(),qingxierApi.relations(),qingxierApi.messages(),qingxierApi.tasks(),qingxierApi.balance()]);Object.assign(this,{reminders,relations,messages,tasks,balance:balance.balance});}}});
