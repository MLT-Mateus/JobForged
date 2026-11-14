"use client";
import {BrandAsset} from '../BrandAsset';
import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {useCompanyAuthSession} from '../auth/auth-service';
import {WorkspaceState} from '../ui';
import type {AwaitedAdminContext} from '../admin/admin-types';
import JobsListClient from './JobsListClient';
import JobWizardClient from './JobWizardClient';
import JobDetailClient from './JobDetailClient';
export default function JobsWorkspace({view,jobId}:{view:'list'|'edit'|'detail'|'preview';jobId?:string}){
 const auth=useCompanyAuthSession(),router=useRouter();
 useEffect(()=>{if(!auth.checking&&(!auth.authenticated||!auth.company||auth.platformAdmin))router.replace('/401?next='+encodeURIComponent(location.pathname))},[auth.checking,auth.authenticated,auth.company,auth.platformAdmin,router]);
 if(auth.checking||!auth.company||!auth.authenticated||auth.platformAdmin)return <main className="jf-session-state"><BrandAsset src="/brand/jobforged-symbol.svg" alt="JobForged" width={48} height={48}/><WorkspaceState title="Validando seu acesso"/></main>;
 const manage=['owner','admin'].includes(auth.role||'');
 if(view==='edit'&&!manage)return <main className="jf-session-state"><WorkspaceState kind="forbidden" title="Acesso restrito" description="Somente titulares e administradores podem editar vagas."/></main>;
 const name=auth.fullName||auth.email||'Conta';
 const context:AwaitedAdminContext={organization:{id:auth.company.id,name:auth.company.name,shortName:auth.company.name,logo:'/brand/jobforged-symbol.svg'},user:{id:'',name,fullName:name,email:auth.email||'',phone:'',role:auth.role||'',initials:name.slice(0,2),permissions:manage?['vacancies.create']:[]},vacancies:[],candidates:[],team:[],invoices:[]};
 return view==='list'?<JobsListClient key={auth.company.id} context={context}/>:(view==='edit'||view==='detail'&&manage)?<JobWizardClient key={auth.company.id+jobId} context={context} jobId={jobId}/>:<JobDetailClient key={auth.company.id+jobId} context={context} jobId={jobId!}/>;
}
