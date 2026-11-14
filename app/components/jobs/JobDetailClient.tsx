"use client";
import {OperationalModule} from '../operations/OperationalModule';
import {JobOptionsPanel} from '../operations/JobOptionsPanel';

import { Panel } from "@/app/components/ui";
/* eslint-disable @next/next/no-html-link-for-pages */
import { useEffect,useMemo,useState } from "react";
import { Check, ChevronRight, ExternalLink, Pause, Play } from "lucide-react";
import { AppToast, ActionButton,EmptyState,StatusBadge,WorkspacePageHeader,WorkspaceTabs,WorkspaceState } from "@/app/components/ui";
import { AdminShell } from "@/app/components/admin/AdminModuleClient";
import type { AwaitedAdminContext } from "@/app/components/admin/admin-types";

import { getCompletion,jobService } from "./job-service";
import type { Job, JobStatus } from "./job-types";
import "./jobs.css";
type Tab="sobre"|"candidaturas"|"automacoes"|"configuracoes";
const tabs:[Tab,string][]=[["sobre","Sobre a vaga"],["candidaturas","Candidaturas"],["automacoes","Automações"],["configuracoes","Configurações"]];
export default function JobDetailClient({context,jobId,initialTab="sobre"}:{context:AwaitedAdminContext;jobId:string;initialTab?:Tab}){
 const manage=context.user.permissions.includes("vacancies.create");

 const [job,setJob]=useState<Job|null>(null),[loading,setLoading]=useState(true),[loadError,setLoadError]=useState(false),[tab,setTab]=useState<Tab>(initialTab),[notice,setNotice]=useState('');
 useEffect(()=>{let active=true;jobService.getJobById(jobId).then(j=>{if(active){setJob(j);setLoading(false)}}).catch(()=>{if(active){setLoadError(true);setLoading(false)}});return()=>{active=false}},[jobId]);
 const quality=useMemo(()=>job?getCompletion(job):null,[job]);
 const status=async(next:JobStatus)=>{if(!job)return;try{setJob(await jobService.changeJobStatus(job.id,next));setNotice(`Status alterado para ${next.toLowerCase()}.`)}catch(error){setNotice(error instanceof Error?error.message:"Não foi possível alterar a vaga.")}};
 if(loading||loadError)return <AdminShell module="vagas" context={context}><WorkspaceState kind={loadError?"error":"loading"} title={loadError?"Não foi possível carregar a vaga":"Carregando vaga…"} action={loadError?<a className="jf-action jf-action--secondary" href="/app/vagas">Voltar para vagas</a>:undefined}/></AdminShell>;
 if(!job)return <AdminShell module="vagas" context={context}><EmptyState title="Vaga não encontrada" description="O registro pode ter sido removido ou você não possui acesso." action={<a className="jf-action jf-action--secondary" href="/app/vagas">Voltar para vagas</a>}/></AdminShell>;
 return <AdminShell module="vagas" context={context}><WorkspacePageHeader section="Painel / Vagas" title={job.title} description={`${job.area} · ${job.modality} · ${job.city}, ${job.state}`} back={{href:"/app/vagas",label:"Voltar para vagas"}} meta={<><StatusBadge tone={job.status==="Publicada"?"positive":job.status==="Pausada"?"warning":"neutral"}>{job.status}</StatusBadge><span>Atualizada em {new Date(job.updatedAt).toLocaleDateString("pt-BR")}</span></>} action={<>{job.status==="Publicada"&&<a className="jf-action jf-action--secondary" href={`/api/company/portal/open?job=${job.id}`} target="_blank" rel="noopener noreferrer"><ExternalLink/>Abrir página</a>}<a className="jf-action jf-action--secondary" href={`/app/vagas/${job.id}/preview`}><ExternalLink/>Pré-visualizar</a>{manage&&<><a className="jf-action jf-action--secondary" href={`/app/vagas/${job.id}/editar`}>Editar</a><ActionButton onClick={()=>status(job.status==="Publicada"?"Pausada":"Publicada")} icon={job.status==="Publicada"?<Pause/>:<Play/>}>{job.status==="Publicada"?"Pausar":"Publicar"}</ActionButton></>}</>}/>{notice&&<AppToast notice={{kind:"info",title:"Atualização",text:notice}} onClose={()=>setNotice("")}/>}
 <WorkspaceTabs label="Seções da vaga" value={tab} onValueChange={setTab} items={tabs.map(([id,label])=>({id,label}))}/>
 {tab==="sobre"&&<div className="job-about"><main><Panel as="section" className="job-panel"><header><div><span>Resumo da oportunidade</span><h2>Sobre a vaga</h2></div><a href={`/app/vagas/${job.id}/editar`}>Editar por etapas <ChevronRight/></a></header><p>{job.summary||"Resumo ainda não preenchido."}</p><div className="job-meta-grid">{[["Área",job.area],["Nível",job.level],["Contratação",job.contractType],["Modalidade",job.modality],["Localização",`${job.city}, ${job.state}`]].map(([a,b])=><div key={a}><span>{a}</span><b>{b||"Não definido"}</b></div>)}</div></Panel>{[["Responsabilidades",job.responsibilities],["Requisitos obrigatórios",job.requirements],["Diferenciais",job.differentiators],["Tecnologias e ferramentas",job.tools]].filter(([,x])=>(x as string[]).length).map(([title,items])=><Panel as="section" className="job-panel" key={title as string}><h2>{title as string}</h2><ul>{(items as string[]).map(x=><li key={x}><Check/>{x}</li>)}</ul></Panel>)}</main><aside><Panel as="section" className="job-panel job-score"><span>Completude</span><strong>{quality?.score}%</strong><i><b style={{width:`${quality?.score}%`}}/></i><p>Qualidade {quality?.quality.toLowerCase()}. {quality?.canPublish?"Campos obrigatórios completos.":"Há pendências obrigatórias."}</p></Panel><Panel as="section" className="job-panel"><h3>Histórico recente</h3><ol className="job-history"><li><i/><span><b>Vaga atualizada</b>{new Date(job.updatedAt).toLocaleDateString("pt-BR")}</span></li><li><i/><span><b>Status: {job.status}</b></span></li><li><i/><span><b>Registro criado</b>{new Date(job.createdAt).toLocaleDateString("pt-BR")}</span></li></ol></Panel></aside></div>}
 {tab==='candidaturas'&&<OperationalModule module="candidaturas" jobId={job.id}/>}{tab==='automacoes'&&<JobOptionsPanel jobId={job.id} automation/>}{tab==='configuracoes'&&<JobOptionsPanel jobId={job.id}/>}</AdminShell>
}
