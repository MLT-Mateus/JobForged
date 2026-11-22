"use client";
import {useEffect,useState} from 'react';
import {permissionLabels,useCompanyAccess,type Access} from './access';
import {CheckboxField,WorkspaceState,AppToast,FormActions,InlineNotice} from '../ui';
import {usePendingChanges} from '../ui/PendingChanges';
const groups:Record<string,string>={dashboards:'Indicadores',jobs:'Vagas',branches:'Filiais',applications:'Candidaturas',agenda:'Agenda',appearance:'Personalização',admins:'Equipe e acessos',settings:'Configurações',finance:'Financeiro'};
export function MemberPermissions({memberId}:{memberId:string}){
 const mine=useCompanyAccess(),[data,setData]=useState<Access|null>(null),[saved,setSaved]=useState<Access|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState(false),[busy,setBusy]=useState(false);
 const dirty=!!saved&&JSON.stringify(data?.permissions)!==JSON.stringify(saved.permissions),guard=usePendingChanges(dirty);
 useEffect(()=>{const controller=new AbortController();void fetch('/api/company/access?member='+memberId,{cache:'no-store',signal:controller.signal}).then(async r=>{if(!r.ok)throw Error();return r.json() as Promise<Access>}).then(result=>{if(!controller.signal.aborted){setData(result);setSaved(result)}}).catch(()=>{if(!controller.signal.aborted)setError('Não foi possível consultar as permissões.')});return()=>controller.abort()},[memberId]);
 if(!data)return <WorkspaceState kind={error?'error':'loading'} title={error||'Carregando permissões...'}/>;
 const editable=mine?.permissions['admins.permissions']&&data.role!=='owner'&&data.memberId!==mine.memberId;
 async function save(){if(!data||busy)return;setBusy(true);try{const r=await fetch('/api/company/access',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({companyId:data.companyId,memberId,permissions:data.permissions,version:data.version})});if(!r.ok)throw Error('Não foi possível salvar. Atualize a página e confira suas permissões.');const value=await r.json() as Access;setData(value);setSaved(value);setError('');setNotice(true);window.dispatchEvent(new Event('jobforged-access-updated'))}catch(e){setError(e instanceof Error?e.message:'Falha ao salvar.')}finally{setBusy(false)}}
 function change(key:string,checked:boolean){if(!data)return;const permissions={...data.permissions,[key]:checked},group=key.split('.')[0],view=group+'.view';
  if(checked){if(view in permissionLabels)permissions[view]=true;if(key==='applications.decide')permissions['applications.move']=true;if(key==='admins.permissions')permissions['admins.manage']=true}
  else{if(key===view)for(const action of Object.keys(permissions))if(action.startsWith(group+'.'))permissions[action]=false;if(key==='applications.move')permissions['applications.decide']=false;if(key==='admins.manage')permissions['admins.permissions']=false}
  setData({...data,permissions});
 }
 return <>{guard.dialog}<details><summary>Permissões por módulo</summary><div className="jf-workspace-stack"><p className="admin-muted">Gerenciar inclui visualizar o módulo. Decidir candidaturas inclui mover etapas. Você só pode conceder os acessos que possui.</p>{Object.entries(groups).map(([group,title])=><fieldset className="jf-fieldset" key={group}><legend>{title}</legend>{Object.entries(permissionLabels).filter(([key])=>key.startsWith(group+'.')).map(([key,label])=><CheckboxField key={key} label={label} checked={!!data.permissions[key]} disabled={!editable||!mine?.permissions[key]||busy} onChange={e=>change(key,e.target.checked)}/>)}</fieldset>)}{error&&<InlineNotice tone="danger">{error}</InlineNotice>}{editable&&<FormActions dirty={dirty} busy={busy} onSave={()=>void save()} onCancel={()=>setData(saved)}/>}</div></details>{notice&&<AppToast notice={{kind:'success',title:'Permissões salvas',text:'Os acessos foram atualizados.'}} onClose={()=>setNotice(false)}/>}</>;
}
