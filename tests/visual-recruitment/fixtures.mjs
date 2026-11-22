import {emptyJob} from '../../app/components/jobs/job-types.ts';
export const cid='72000000-0000-4000-8000-000000000001';
export const jid='72000000-0000-4000-8000-000000000002';
export const title='Analista de relacionamento com clientes e operações digitais';
const date='2026-11-22T12:00:00Z',keys=['screening','interview','approved','hired'],labels=['Triagem','Entrevista','Aprovação','Contratação'];
export const job={...emptyJob(cid),id:jid,title,area:'Atendimento',contractType:'Efetivo - CLT',modality:'Remoto',remoteScope:'Brasil',journey:'Horário definido',schedule:'Segunda a sexta, 9h às 18h',description:'Apoie clientes com clareza e empatia. Trabalhe com a equipe de operações para melhorar cada atendimento.',attributions:'Responder dúvidas e acompanhar chamados.\nDocumentar soluções e compartilhar aprendizados.',requirements:['Comunicação clara','Organização'],positions:2,lgpd:true,portalReady:true,createdAt:date,updatedAt:date,version:1,colorToken:2};
const permissions=Object.fromEntries(['dashboards.view','jobs.view','jobs.create','jobs.edit','jobs.delete','branches.view','branches.manage','applications.view','applications.move','applications.decide','applications.notes','applications.resume','agenda.view','agenda.manage','appearance.manage','admins.view','settings.manage','finance.view'].map(k=>[k,true]));
const access={companyId:cid,memberId:cid,role:'owner',permissions,version:1,limitsEnforced:false};
const cards=Array.from({length:128},(_,i)=>({id:'73000000-0000-4000-8000-'+String(i+1).padStart(12,'0'),jobId:jid,jobTitle:title,name:i?'Pessoa de validação '+(i+1):'Alexandra de Albuquerque Montenegro — nome extenso para validação',stageKey:keys[i%4],stage:labels[i%4],outcome:'active',version:1,createdAt:date,updatedAt:date,stageEnteredAt:date,reviewNeeded:false,legacyStage:null,hasResume:i%3!==0,colorToken:2,nextInterview:i%4===1?{id:'interview',startsAt:null,status:'A agendar'}:null}));
export function response(u,method,b){
 const scenario=u.searchParams.get('__scenario');
 if(scenario==='error'&&u.pathname==='/api/company/applications')return{status:503,data:{message:'Serviço indisponível. Tente novamente.'}};
 if(u.pathname==='/api/auth/session')return{data:{company:{id:cid,name:'Horizonte — Validação isolada'},email:'pessoa@example.invalid',fullName:'Pessoa de validação',role:'owner',authenticated:true}};
 if(u.pathname==='/api/company/access')return{data:access};
 if(u.pathname==='/api/company/branding')return{data:{companyId:cid,companyName:'Horizonte',editable:true,version:1,draft:{},published:{},history:[]}};
 if(u.pathname==='/api/communications')return{data:{items:[],unread:0,hasNext:false}};
 if(u.pathname==='/api/company/branches')return{data:[{id:'unit-1',name:'Matriz',city:'Brasília',state:'DF',status:'Ativo',street:'Rua de exemplo',number:'100'}]};
 if(u.pathname==='/api/company/jobs'){
  if(b?.operation==='context')return{data:{portalReady:true}};
  if(b?.operation==='validate')return{data:{canPublish:true,issues:[]}};
  if(b)return{data:{...job,...b.document,status:b.operation==='publish'?'Publicada':'Rascunho',version:job.version+1}};
  return{data:u.searchParams.get('id')?job:[job]};
 }
 if(u.pathname==='/api/company/applications'){
  const op=b?.operation||u.searchParams.get('operation'),id=b?.id||u.searchParams.get('id'),a=cards.find(a=>a.id===id);
  if(op==='detail')return{data:{...a,email:'pessoa.com.endereco.extenso@example.invalid',notes:'',reason:'',resume:a?.hasResume?'curriculo-exemplo.pdf':null}};
  if(op==='history')return{data:{items:Array.from({length:5},(_,i)=>({id:'event-'+i,action:'Etapa alterada',details:{from:'Triagem',to:'Entrevista'},actor:'Pessoa da equipe',createdAt:date})),total:42}};
  if(b){if(a){Object.assign(a,b.document);a.version++;a.stage=labels[keys.indexOf(a.stageKey)]}return{data:a}};
  const q=u.searchParams.get('query')||'',sk=u.searchParams.get('stageKey'),out=u.searchParams.get('outcome')||'active',pg=Number(u.searchParams.get('page'))||1,size=Number(u.searchParams.get('pageSize'))||20;
  const filtered=scenario==='empty'?[]:cards.filter(a=>(out==='active'?a.outcome==='active':a.outcome!=='active')&&(!q||a.name.toLowerCase().includes(q.toLowerCase())));
  const list=filtered.filter(a=>!sk||a.stageKey===sk);
  return{data:{companyId:cid,access,items:list.slice((pg-1)*size,pg*size),total:list.length,counts:Object.fromEntries(keys.map(k=>[k,filtered.filter(a=>a.stageKey===k).length])),page:pg,jobs:[{id:jid,title,colorToken:2}]}};
 }
 return{data:{items:[],total:0}};
}
