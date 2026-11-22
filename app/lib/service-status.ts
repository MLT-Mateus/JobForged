import {getSupabaseConfig} from '@/app/api/auth/_server';
export type ServiceState='operational'|'degraded'|'maintenance';
export type PublicStatus={state:ServiceState;checkedAt:string;services:{id:string;label:string;state:ServiceState}[]};
let cache:{at:number;value:PublicStatus}|null=null,pending:Promise<PublicStatus>|null=null;
export function publicServiceStatus():Promise<PublicStatus>{
 if(cache&&Date.now()-cache.at<15000)return Promise.resolve(cache.value);
 if(pending)return pending;
 pending=(async()=>{const config=getSupabaseConfig();let services:{id:string;state:string}[]=[];
 if(config)try{const r=await fetch(config.url+'/internal/service-status',{headers:{apikey:config.anonKey,Authorization:'Bearer '+config.anonKey},cache:'no-store',signal:AbortSignal.timeout(4000)});if(r.ok){const a=await r.json() as {services?:{id:string;state:string}[]};if(Array.isArray(a.services))services=a.services}}catch{/* Only public states are returned. */}
 const labels=[['access','Acesso às contas'],['data','Informações da plataforma'],['files','Imagens e arquivos']];
 const rows=[{id:'platform',label:'Página e painéis',state:'operational' as ServiceState},...labels.map(([id,label])=>({id,label,state:(services.find(s=>s?.id===id)?.state==='operational'?'operational':'degraded') as ServiceState}))];
 const value:PublicStatus={state:rows.every(s=>s.state==='operational')?'operational':'degraded',checkedAt:new Date().toISOString(),services:rows};cache={at:Date.now(),value};return value;
 })().finally(()=>{pending=null});return pending;
}
