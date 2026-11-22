"use client";
import {editorChecks,normalizeJob,publicationIssues,type PublicationIssue} from './job-editor-model';
import type {Job,JobStatus} from './job-types';
export class JobRequestError extends Error{constructor(message:string,public issues:PublicationIssue[]=[]){super(issues.length?message+" "+issues.map(i=>i.message).join(" "):message)}}
async function request<T>(id?:string,body?:unknown):Promise<T>{const r=await fetch('/api/company/jobs'+(id?'?id='+encodeURIComponent(id):''),{method:body?'POST':'GET',cache:'no-store',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});const data=await r.json() as T&{message?:string;issues?:PublicationIssue[]};if(!r.ok)throw new JobRequestError(data.message||'Não foi possível salvar a vaga.',data.issues);return data;}
function document(job:Job){const {id,organizationId,createdAt,updatedAt,status,applicationsCount,version,colorToken,hasUnpublishedChanges,publishedVersion,portalReady,...fields}=normalizeJob(job);void [id,organizationId,createdAt,updatedAt,status,applicationsCount,version,colorToken,hasUnpublishedChanges,publishedVersion,portalReady];return fields;}
export const jobService={
 async listJobs(organizationId:string){return (await request<Job[]>()).filter(j=>j.organizationId===organizationId)},
 async getJobById(id:string){return request<Job|null>(id)},
 async context(companyId:string){return request<{portalReady:boolean}>(undefined,{operation:'context',companyId})},
 async validate(job:Job){return request<{issues:PublicationIssue[];canPublish:boolean}>(undefined,{operation:'validate',companyId:job.organizationId,id:job.id||undefined,document:document(job)})},
 async createJob(job:Job){return request<Job>(undefined,{operation:'save',companyId:job.organizationId,document:document(job)})},
 async updateJob(id:string,job:Job){return request<Job>(undefined,{operation:'save',id,companyId:job.organizationId,version:job.version,document:document(job)})},
 async setColor(job:Job,colorToken:number){return request<Job>(undefined,{operation:'color',id:job.id,companyId:job.organizationId,version:job.version,document:{colorToken}})},
 async publish(job:Job){return request<Job>(undefined,{operation:'publish',id:job.id,companyId:job.organizationId,version:job.version})},
 async duplicateJob(id:string){const source=await this.getJobById(id);if(!source)throw Error('Vaga não encontrada.');return this.createJob({...source,id:'',title:('Cópia de '+source.title).slice(0,120),status:'Rascunho',lgpd:false,applicationDeadline:'',currentStep:0})},
 async changeJobStatus(id:string,status:JobStatus,observed?:Job){const job=observed||await this.getJobById(id);if(!job)throw Error('Vaga não encontrada.');return request<Job>(undefined,{operation:'status',id,companyId:job.organizationId,version:job.version,status})},
 async archiveJob(id:string){return this.changeJobStatus(id,'Arquivada')},
 async deleteJob(id:string,observed?:Job){const job=observed||await this.getJobById(id);if(!job)throw Error('Vaga não encontrada.');await request(undefined,{operation:'delete',id,companyId:job.organizationId,version:job.version})},
};
export function getCompletion(job:Job){const required=editorChecks(job),optional=[job.experience,job.weeklyHours,job.benefits.length,job.teamDescription,job.education];const score=Math.round(required.filter(c=>c.done).length/required.length*100);return {score,optionalDone:optional.filter(Boolean).length,optionalTotal:optional.length,requiredDone:required.filter(c=>c.done).length,requiredTotal:required.length,quality:score===100?'Completa':'Em preparação',canPublish:publicationIssues(job).length===0};}