"use client";
import type {CompanyPortalState} from '@/app/lib/company-portal';
import type {Customization} from './personalization-types';
import {brandContent} from './branding-model';
async function call(body?:object):Promise<CompanyPortalState>{const response=await fetch('/api/company/portal',{cache:'no-store',credentials:'same-origin',...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});const data=await response.json() as Partial<CompanyPortalState>&{message?:string};if(!response.ok||!data?.companyId)throw new Error(data?.message||'Não foi possível carregar o endereço.');return data as CompanyPortalState}
export const portalService={load:()=>call(),address:(companyId:string,version:number,slug:string)=>call({operation:'address',companyId,version,slug}),publish:(input:Customization,version:number)=>call({operation:'publish',companyId:input.organizationId,version,brandingVersion:input.revision,configuration:brandContent(input)}),unpublish:(companyId:string,version:number)=>call({operation:'unpublish',companyId,version})};
