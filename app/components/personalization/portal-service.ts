"use client";
import {apiResponse,readApi} from '@/app/lib/api-response';
import type {CompanyPortalState} from '@/app/lib/company-portal';
import type {DomainReplacement} from '@/app/lib/company-domain';
import type {Customization} from './personalization-types';
import {brandContent} from './branding-model';
async function call(body?:object):Promise<CompanyPortalState>{if(!body)return readApi<CompanyPortalState>('/api/company/portal','Não foi possível carregar o endereço.');const response=await fetch('/api/company/portal',{cache:'no-store',credentials:'same-origin',...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});const data=await apiResponse<Partial<CompanyPortalState>&{message?:string}>(response,'Não foi possível carregar o endereço.');if(!response.ok||!data?.companyId)throw new Error(data?.message||'Não foi possível carregar o endereço.');return data as CompanyPortalState}
export const portalService={load:()=>call(),address:(companyId:string,version:number,slug:string)=>call({operation:'address',companyId,version,slug}),publish:(input:Customization,version:number,domain?:DomainReplacement)=>call({operation:'save',companyId:input.organizationId,version,brandingVersion:input.revision,configuration:brandContent(input),domain})};
