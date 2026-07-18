export function dashboardCards(data:any){return[{label:'用户数',value:data?.users??0},{label:'设备数',value:data?.devices??0},{label:'在线设备',value:data?.onlineDevices??0},{label:'收入',value:`¥${Number(data?.revenue??0).toFixed(2)}`}];}
export function userStatusText(status:string){return status==='active'?'正常':'已停用'}
export function auditStatusType(status:string){return status==='approved'||status==='succeeded'?'success':status==='rejected'||status==='failed'?'danger':'warning'}
export function otaSummary(items:any[]){return{total:items.length,published:items.filter(x=>x.status==='published').length,mandatory:items.filter(x=>x.mandatory).length,averageRollout:items.length?Math.round(items.reduce((s,x)=>s+Number(x.rolloutPercent||0),0)/items.length):0}}
export function dialectRows(metrics:any){return Object.entries(metrics?.dialectDistribution??{}).map(([dialect,count])=>({dialect,count:Number(count)})).sort((a,b)=>b.count-a.count)}
export function filterRows<T extends Record<string,any>>(rows:T[],query:string,fields:Array<keyof T>){const q=query.trim().toLowerCase();if(!q)return rows;return rows.filter(row=>fields.some(f=>String(row[f]??'').toLowerCase().includes(q)))}
