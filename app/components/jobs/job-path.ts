import type {PublicJob} from './PublicJobs';
export function jobPath(company:string,job:Pick<PublicJob,'id'|'title'>){
 const title=job.title.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80);
 return `/vagas/${encodeURIComponent(company)}/${title||'oportunidade'}-${job.id}`;
}
