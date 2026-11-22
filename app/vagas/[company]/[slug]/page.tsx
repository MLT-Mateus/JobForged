import {PublicVacancy} from '@/app/components/jobs/PublicVacancy';
import type {Metadata} from 'next';
import {notFound,redirect} from 'next/navigation';
import {jobPath,loadPublicJob} from '@/app/lib/public-job';
import {publicPageMetadata,searchEnvironment} from '@/app/lib/seo';
import {brandingLogo} from '@/app/components/personalization/branding-model';
import '@/app/components/personalization/company-branding.css';
import './vacancy.css';
type Props={params:Promise<{company:string;slug:string}>};
export const dynamic='force-dynamic';
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {company,slug}=await params,data=await loadPublicJob(company,slug);
 if(!data)return {title:'Oportunidade indisponível',robots:{index:false,follow:false}};
 const {job,portal}=data,path=jobPath(company,job),title=`${job.title} · ${portal.displayName}`;
 const description=job.summary.slice(0,200),url=new URL(path,searchEnvironment().origin).href;
 const image=new URL(brandingLogo(portal,'light'),searchEnvironment().origin).href;
 return {...publicPageMetadata(path),robots:{index:false,follow:true},title,description,openGraph:{type:'website',title,description,url,siteName:portal.displayName,images:[{url:image,alt:portal.displayName}]},twitter:{card:'summary',title,description,images:[image]}};
}
export default async function Page({params}:Props){
 const {company,slug}=await params,data=await loadPublicJob(company,slug);
 if(!data)notFound();
 const {job,portal}=data,path=jobPath(company,job);
 if(path!==`/vagas/${company}/${slug}`)redirect(path);
 return <PublicVacancy portal={portal} job={job} slug={company}/>;
}

