export const DIALECTS = ['mandarin','minnan','wu','cantonese','sichuanese','shaanxi','henan','shanghainese'] as const;
export type DialectCode = typeof DIALECTS[number];
export type Mode = 'child'|'adult';
export type Persona = 'mom'|'dad'|'lover'|'teacher'|'bestie';
export type PrincipalRole = 'user'|'device'|'admin';
export interface ApiEnvelope<T>{code:number;message:string;data:T;traceId:string}
export interface ApiErrorEnvelope{code:number;message:string;error:string;data?:unknown;traceId:string}
export interface DeviceSummary{deviceId:string;name:string;online:boolean;batteryPercent:number;charging:boolean;firmwareVersion:string;currentMode:Mode;currentPersona:Persona;lastSeenAt:string}
export interface SpeechProfile{deviceId:string;autoDialect:true;fallbackDialect:DialectCode;highConfidenceThreshold:number;mediumConfidenceThreshold:number;cloneVoiceId:string|null;cloneModel:string;systemModel:string;version:number}
export const api={
  login:'/api/v1/auth/wechat-login',refresh:'/api/v1/auth/refresh',phoneBind:'/api/v1/auth/phone-bind',me:'/api/v1/users/me',addresses:'/api/v1/users/me/addresses',
  devices:'/api/v1/devices',device:(id:string)=>`/api/v1/devices/${encodeURIComponent(id)}`,deviceStatus:(id:string)=>`/api/v1/devices/${encodeURIComponent(id)}/status`,deviceCommands:(id:string)=>`/api/v1/devices/${encodeURIComponent(id)}/commands`,
  speechCapabilities:'/api/v1/speech/capabilities',speechProfile:(id:string)=>`/api/v1/devices/${encodeURIComponent(id)}/speech-profile`,wakeWordStatus:(id:string)=>`/api/v1/devices/${encodeURIComponent(id)}/wake-word/status`,speechSessions:'/api/v1/speech/sessions',speechRoute:'/api/v1/speech/route',speechTts:'/api/v1/speech/tts',
  dialogs:'/api/v1/dialogs',dialogText:'/api/v1/dialogs/text',dialogTurns:(id:string)=>`/api/v1/dialogs/${encodeURIComponent(id)}/turns`,moodWeekly:'/api/v1/mood-reports/weekly',
  reminders:'/api/v1/reminders',reminder:(id:string)=>`/api/v1/reminders/${encodeURIComponent(id)}`,reminderConfirm:(id:string)=>`/api/v1/reminders/${encodeURIComponent(id)}/confirm`,
  invitations:'/api/v1/relations/invitations',relations:'/api/v1/relations',messages:'/api/v1/messages',messageRead:(id:string)=>`/api/v1/messages/${encodeURIComponent(id)}/read`,
  kidsCategories:'/api/v1/kids/content/categories',kidsContent:'/api/v1/kids/content',customQas:'/api/v1/custom-qas',customContents:'/api/v1/custom-contents',customContentUpload:'/api/v1/custom-contents/upload-token',
  parentControl:(id:string)=>`/api/v1/parent-controls/${encodeURIComponent(id)}`,parentRecords:(id:string)=>`/api/v1/parent-controls/${encodeURIComponent(id)}/dialog-records`,sleepMode:(id:string)=>`/api/v1/parent-controls/${encodeURIComponent(id)}/sleep-mode`,
  personas:'/api/v1/personas',voiceClones:'/api/v1/voice-clones',voiceCloneUpload:'/api/v1/voice-clones/upload-token',tasks:'/api/v1/tasks/today',rewards:'/api/v1/rewards/balance',rewardCatalog:'/api/v1/rewards/catalog',
  plans:'/api/v1/subscription/plans',subscription:'/api/v1/subscription/current',orders:'/api/v1/orders',products:'/api/v1/shop/products',shopOrders:'/api/v1/shop/orders',
  adminDashboard:'/api/v1/admin/dashboard',adminUsers:'/api/v1/admin/users',adminDevices:'/api/v1/admin/devices',adminOrders:'/api/v1/admin/orders',adminContent:'/api/v1/admin/content-library',adminAudits:'/api/v1/admin/content-audits',adminOta:'/api/v1/admin/ota-packages',adminWakeWords:'/api/v1/admin/wake-word-packages',adminMetrics:'/api/v1/admin/speech/metrics',adminLogs:'/api/v1/admin/audit-logs'
} as const;
