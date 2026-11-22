import type {Metadata} from 'next';
import {brandingIcon} from '@/app/components/personalization/branding-model';
import {notFound} from 'next/navigation';
import {loadPublicPortal} from '@/app/lib/public-portal';
import {PublicCompanyPortal} from '@/app/components/personalization/PublicCompanyPortal';
import {richTextPlain} from '@/app/components/ui/rich-content';
export const dynamic='force-dynamic';
export async function generateMetadata({params}:{params:Promise<{companySlug:string}>}):Promise<Metadata>{const {companySlug}=await params;const data=await loadPublicPortal(companySlug);const icon=data?brandingIcon(data,'light'):undefined;const url=icon?icon+'?icon=1&v=3':'/favicon.svg';const title=data?`Carreiras | ${data.displayName}`:'Carreiras | JobForged';const description=data?richTextPlain(data.portal.introduction).slice(0,180):'Conheça as oportunidades profissionais.';return {title:{absolute:title},description,openGraph:{title,description,type:'website'},robots:{index:false,follow:false},icons:{icon:[{url}],shortcut:url}}}
export default async function Page({params,searchParams}:{params:Promise<{companySlug:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const {companySlug}=await params;const data=await loadPublicPortal(companySlug);if(!data)notFound();

 return <PublicCompanyPortal data={data} slug={companySlug} initialLogin={(await searchParams)?.acesso==='entrar'}/>;
}
