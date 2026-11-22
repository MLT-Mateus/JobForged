"use client";
import {jobDisplayTitle} from "./job-editor-model";
import {useCollectionNavigation} from '../ui/useCollectionNavigation';
import {useEffect,useState} from 'react';
import {AdminShell} from '../admin/AdminModuleClient';
import type {AwaitedAdminContext} from '../admin/admin-types';
import {Panel,WorkspaceState,WorkspacePageHeader} from '../ui';
import {JobDraftDescription} from './JobDraftDescription';
import {jobService} from './job-service';
import type {Job} from './job-types';
export function JobPreviewClient({jobId,context}:{jobId:string;context:AwaitedAdminContext}){
 const {withReturn}=useCollectionNavigation('/app/vagas');
 const [job,setJob]=useState<Job|null>(null),[error,setError]=useState(false);
 useEffect(()=>{let active=true;void jobService.getJobById(jobId).then(value=>{if(active){setJob(value);setError(!value)}}).catch(()=>{if(active)setError(true)});return()=>{active=false}},[jobId]);
 return <AdminShell module="vagas" context={context}><WorkspacePageHeader section="Painel / Vagas / Prévia" title="Prévia da vaga" description="Confira o anúncio antes de publicar." back={{href:withReturn('/app/vagas/'+jobId),label:'Voltar à vaga'}}/>{error?<WorkspaceState kind="error" title="Não foi possível abrir a prévia"/>:!job?<WorkspaceState title="Carregando prévia..."/>:<Panel><div className="jf-panel-body"><h1>{jobDisplayTitle(job.title)}</h1><JobDraftDescription job={job}/></div></Panel>}</AdminShell>;
}
