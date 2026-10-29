import {getSupabaseConfig,requestDatabase} from '@/app/api/auth/_server';
import {brandingDefaults} from '@/app/components/personalization/branding-model';
import type {Customization} from '@/app/components/personalization/personalization-types';
import {validPortalSlug} from './company-portal';
export async function loadPublicPortal(slug:string):Promise<Customization|null>{
 if(!validPortalSlug(slug))return null;const config=getSupabaseConfig();if(!config)return null;
 const response=await requestDatabase('rpc/read_public_company_portal',config.anonKey,{requested_slug:slug});
 if(!response?.ok)throw new Error('Não foi possível carregar a página da empresa.');
 const result=await response.json() as {version:number;configuration:Partial<Customization>}|null;
 if(!result?.configuration?.displayName)return null;
 const base=brandingDefaults('public',result.configuration.displayName);
 return {...base,...result.configuration,organizationId:'public',revision:result.version,publishedBy:'',publishedAt:'',draftUpdatedAt:''} as Customization;
}
