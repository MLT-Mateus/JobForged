"use client";
import { defaultSettings, seedCandidates, seedJobs } from "./job-mocks";
import { emptyJob, type Candidate, type Job, type JobSettings, type JobStatus } from "./job-types";
const JOBS="jobforged.jobs.v1", CANDIDATES="jobforged.candidates.v1", SETTINGS="jobforged.job-settings.v1", DRAFT="jobforged.job-draft.v1";
const read=<T,>(key:string,fallback:T):T=>{if(typeof window==="undefined")return fallback;try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback}catch{return fallback}};
const write=(key:string,value:unknown)=>{if(typeof window!=="undefined")localStorage.setItem(key,JSON.stringify(value))};
const ensure=()=>{if(typeof window==="undefined")return;if(!localStorage.getItem(JOBS))write(JOBS,seedJobs);if(!localStorage.getItem(CANDIDATES))write(CANDIDATES,seedCandidates)};
export const jobService={
 async listJobs(organizationId:string){ensure();return read<Job[]>(JOBS,seedJobs).filter(x=>x.organizationId===organizationId)},
 async getJobById(id:string){ensure();return read<Job[]>(JOBS,seedJobs).find(x=>x.id===id)||null},
 async createJob(input:Job){ensure();const all=read<Job[]>(JOBS,seedJobs),time=new Date().toISOString();const job={...input,id:input.id||`job-${Date.now()}`,createdAt:input.createdAt||time,updatedAt:time};write(JOBS,[job,...all.filter(x=>x.id!==job.id)]);return job},
 async updateJob(id:string,patch:Partial<Job>){const all=read<Job[]>(JOBS,seedJobs);const current=all.find(x=>x.id===id);if(!current)throw new Error("Vaga não encontrada");const job={...current,...patch,updatedAt:new Date().toISOString()};write(JOBS,all.map(x=>x.id===id?job:x));return job},
 async duplicateJob(id:string){const source=await this.getJobById(id);if(!source)throw new Error("Vaga não encontrada");return this.createJob({...source,id:"",title:`Cópia de ${source.title}`,status:"Rascunho",applicationsCount:0})},
 async changeJobStatus(id:string,status:JobStatus){return this.updateJob(id,{status})},
 async archiveJob(id:string){return this.changeJobStatus(id,"Arquivada")},
 async deleteJob(id:string){write(JOBS,read<Job[]>(JOBS,seedJobs).filter(x=>x.id!==id))},
 async getJobApplications(jobId:string){ensure();return read<Candidate[]>(CANDIDATES,seedCandidates).filter(x=>x.jobId===jobId)},
 async moveCandidate(id:string,stage:string){const all=read<Candidate[]>(CANDIDATES,seedCandidates);write(CANDIDATES,all.map(x=>x.id===id?{...x,stage,updatedAt:new Date().toISOString(),history:[...x.history,`Movido para ${stage}`]}:x))},
 async saveCandidateNotes(id:string,notes:string){const all=read<Candidate[]>(CANDIDATES,seedCandidates);write(CANDIDATES,all.map(x=>x.id===id?{...x,notes,updatedAt:new Date().toISOString()}:x))},
 async getJobSettings(id:string){return read<Record<string,JobSettings>>(SETTINGS,{})[id]||{...defaultSettings,slug:id}},
 async saveJobAutomation(id:string,settings:JobSettings){const all=read<Record<string,JobSettings>>(SETTINGS,{});write(SETTINGS,{...all,[id]:settings});return settings},
 async saveJobSettings(id:string,settings:JobSettings){return this.saveJobAutomation(id,settings)},
 async isSlugAvailable(slug:string,jobId:string){const all=read<Record<string,JobSettings>>(SETTINGS,{});return !Object.entries(all).some(([id,x])=>id!==jobId&&x.slug===slug)},
 saveDraft(job:Job){write(DRAFT,job)}, getDraft(){return read<Job>(DRAFT,emptyJob())}, clearDraft(){if(typeof window!=="undefined")localStorage.removeItem(DRAFT)}
};

export function getCompletion(job:Job){
 const required=[job.title,job.area,job.level,job.contractType,job.modality,job.country,job.state,job.city,job.summary,job.responsibilities.length>=3,job.requirements.length>=3,job.stages.length>0,job.lgpd];
 const optional=[job.experience,job.weeklyHours,job.softSkills.length,job.benefits.length,job.teamDescription,job.tools.length,job.applicationDeadline,job.education,job.interviewTypes.length];
 const score=Math.round((required.filter(Boolean).length*2+optional.filter(Boolean).length)/(required.length*2+optional.length)*100);
 return {score,requiredDone:required.filter(Boolean).length,requiredTotal:required.length,quality:score>=85?"Completa":score>=55?"Estruturada":"Básica",canPublish:required.every(Boolean)};
}
