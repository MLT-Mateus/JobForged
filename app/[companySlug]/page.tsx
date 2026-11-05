import type {Metadata} from 'next';
import {brandingIcon} from '@/app/components/personalization/branding-model';
import {headers} from 'next/headers';
import {notFound} from 'next/navigation';
import {loadPublicPortal} from '@/app/lib/public-portal';
import {PublicCompanyPortal} from '@/app/components/personalization/PublicCompanyPortal';
export const dynamic='force-dynamic';
export async function generateMetadata({params}:{params:Promise<{companySlug:string}>}):Promise<Metadata>{const {companySlug}=await params;const data=await loadPublicPortal(companySlug);const icon=data?brandingIcon(data,'light'):undefined;const url=icon?icon+'?icon=1&v=3':'/favicon.svg';return {title:'Carreiras | JobForged',robots:{index:false,follow:false},icons:{icon:[{url}],shortcut:url}}}
export default async function Page({params,searchParams}:{params:Promise<{companySlug:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const {companySlug}=await params;const data=await loadPublicPortal(companySlug);if(!data)notFound();
 const canonical=new URL(process.env.APP_PUBLIC_URL||'https://test.jobforged.com');const h=await headers();const raw=h.get('x-forwarded-host')||h.get('host')||canonical.host;
 let hostname=canonical.hostname;try{hostname=new URL('https://'+raw).hostname}catch{/* Proxy rejects malformed hosts. */}
 const external=hostname!==canonical.hostname&&!['localhost','127.0.0.1','[::1]'].includes(hostname);
 return <PublicCompanyPortal data={data} slug={companySlug} externalAccountHref={external?new URL('/'+companySlug+'?acesso=entrar',canonical).href:undefined} initialLogin={!external&&(await searchParams)?.acesso==='entrar'}/>;
}
