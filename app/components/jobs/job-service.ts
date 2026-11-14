"use client";
/* eslint-disable @typescript-eslint/no-unused-vars */
import {editorChecks} from "./job-editor-model";
import { defaultSettings } from "./job-mocks";
import { type Candidate, type Job, type JobSettings, type JobStatus } from "./job-types";
async function request<T>(id?:string,body?:unknown):Promise<T>{const r=await fetch('/api/company/jobs'+(id?'?id='+encodeURIComponent(id):''),{method:body?'POST':'GET',cache:'no-store',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});const data=await r.json() as T & {message?:string};if(!r.ok)throw new Error(data.message||'Não foi possível salvar a vaga.');return data}
function document(job:Job){const {id,organizationId,createdAt,updatedAt,status,applicationsCount,version,...fields}=job;void id;void organizationId;void createdAt;void updatedAt;void status;void applicationsCount;void version;return fields}
export const jobService={
 async listJobs(organizationId:string){return (await request<Job[]>()).filter(j=>j.organizationId===organizationId)},
 async getJobById(id:string){return request<Job|null>(id)},
 async createJob(input:Job){return request<Job>(undefined,{operation:'save',companyId:input.organizationId,document:document(input),status:input.status})},
 async updateJob(id:string,patch:Partial<Job>){const current=await this.getJobById(id);if(!current)throw new Error('Vaga não encontrada.');const job={...current,...patch};return request<Job>(undefined,{operation:'save',id,companyId:job.organizationId,version:job.version,document:document(job),status:job.status})},
 async duplicateJob(id:string){const source=await this.getJobById(id);if(!source)throw new Error('Vaga não encontrada.');return this.createJob({...source,id:'',title:'Cópia de '+source.title,status:'Rascunho'})},
 async changeJobStatus(id:string,status:JobStatus){const current=await this.getJobById(id);if(!current)throw new Error('Vaga não encontrada.');return request<Job>(undefined,{operation:'status',id,companyId:current.organizationId,version:current.version,status})},
 async archiveJob(id:string){return this.changeJobStatus(id,'Arquivada')},
 async deleteJob(id:string){const current=await this.getJobById(id);if(!current)throw new Error('Vaga não encontrada.');await request(undefined,{operation:'delete',id,companyId:current.organizationId,version:current.version})},
 async getJobApplications(_jobId:string):Promise<Candidate[]>{return []},
 async moveCandidate(_id:string,_stage:string){throw new Error('Candidaturas ainda não disponíveis.')},
 async saveCandidateNotes(_id:string,_notes:string){throw new Error('Candidaturas ainda não disponíveis.')},
 async getJobSettings(id:string){return {...defaultSettings,slug:id}},
 async saveJobAutomation(_id:string,_settings:JobSettings):Promise<JobSettings>{throw new Error('Automações ainda não disponíveis.')},
 async saveJobSettings(_id:string,_settings:JobSettings):Promise<JobSettings>{throw new Error('Configurações adicionais ainda não disponíveis.')},
 async isSlugAvailable(_slug:string,_jobId:string){return false},

};

export function getCompletion(job:Job){
 const required=editorChecks({...job,pcd:job.pcd||"",journey:job.journey||"",salaryRange:job.salaryRange||""}).map(c=>c.done);
 const optional=[job.experience,job.weeklyHours,job.softSkills.length,job.benefits.length,job.teamDescription,job.tools.length,job.applicationDeadline,job.education,job.interviewTypes.length];
 const score=Math.round((required.filter(Boolean).length*2+optional.filter(Boolean).length)/(required.length*2+optional.length)*100);
 return {score,requiredDone:required.filter(Boolean).length,requiredTotal:required.length,quality:score>=85?"Completa":score>=55?"Estruturada":"Básica",canPublish:required.every(Boolean)};
}
