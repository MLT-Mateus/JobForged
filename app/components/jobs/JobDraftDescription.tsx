"use client";
import {useEffect,useState} from 'react';
import {JobDescription} from './JobDescription';
import {ActionButton,InlineNotice} from '../ui';
import type {Job} from './job-types';
import type {JobBranch} from './JobBranchesField';
export function JobDraftDescription({job}:{job:Job}){
 const [branches,setBranches]=useState<JobBranch[]>([]),[error,setError]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{const c=new AbortController();fetch('/api/company/branches',{cache:'no-store',signal:c.signal}).then(async r=>{if(!r.ok)throw Error();return r.json() as Promise<JobBranch[]>}).then(v=>{setBranches(v);setError(false)}).catch(()=>{if(!c.signal.aborted)setError(true)});return()=>c.abort()},[retry]);
 return <>{error&&job.branchIds.length>0&&<InlineNotice tone="info">Não foi possível carregar os endereços. <ActionButton variant="quiet" onClick={()=>setRetry(v=>v+1)}>Tentar novamente</ActionButton></InlineNotice>}<JobDescription job={{...job,branches:branches.filter(b=>job.branchIds.includes(b.id))}}/></>;
}
