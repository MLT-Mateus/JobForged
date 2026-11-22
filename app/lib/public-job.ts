import {cache} from 'react';
import {getSupabaseConfig,requestDatabase} from '@/app/api/auth/_server';
import {loadPublicPortal} from './public-portal';
import type {PublicJob} from '@/app/components/jobs/PublicJobs';

export {jobPath} from '@/app/components/jobs/job-path';
export const loadPublicJob=cache(async(company:string,slug:string)=>{
 const id=slug.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i)?.[1];
 if(!id)return null;
 const portal=await loadPublicPortal(company),config=getSupabaseConfig();
 if(!portal||!config)return null;
 const response=await requestDatabase('rpc/public_jobs_v1',config.anonKey,{requested_slug:company});
 if(!response?.ok)throw new Error('Não foi possível consultar a oportunidade.');
 const jobs=await response.json() as PublicJob[];
 const job=jobs.find(item=>item.id===id);
 return job?{portal,job}:null;
});
