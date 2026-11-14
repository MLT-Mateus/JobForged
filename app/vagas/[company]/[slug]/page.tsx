import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {jobPath,loadPublicJob} from '@/app/lib/public-job';
import {publicPageMetadata,searchEnvironment} from '@/app/lib/seo';
import {brandingStyle,brandingLogo} from '@/app/components/personalization/branding-model';
import {BrandAsset} from '@/app/components/BrandAsset';
import {Panel,RichContent} from '@/app/components/ui';
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
 return <main className="company-branding public-vacancy" style={brandingStyle(portal,'light')}><Link href={`/${company}`}>← Todas as oportunidades de {portal.displayName}</Link><Panel><header><BrandAsset src={brandingLogo(portal,'light')} alt={portal.displayName}/><p>{portal.displayName}</p><h1>{job.title}</h1><p>{[job.area,job.level,job.contractType,job.modality,[job.city,job.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}</p></header><section><h2>Sobre a oportunidade</h2><RichContent value={job.description||job.summary}/></section>{(job.salaryRange&&job.salaryRange!=='Informar valores')?<section><h2>Remuneração</h2><p>{job.salaryRange}</p></section>:job.salaryMin&&<section><h2>Remuneração</h2><p>{job.currency} {job.salaryMin}{job.salaryMax?` – ${job.salaryMax}`:''}</p></section>}{([['Responsabilidades',job.attributions?[]:job.responsibilities],['Requisitos',job.requirements],['Benefícios',job.benefits]] as [string,string[]][]).map(([label,items])=>items.length>0&&<section key={label}><h2>{label}</h2><ul>{items.map((item,i)=><li key={i}>{item}</li>)}</ul></section>)}{job.attributions&&<section><h2>Atribuições</h2><RichContent value={job.attributions}/></section>}{job.additionalBenefits&&<section><h2>Outros benefícios</h2><RichContent value={job.additionalBenefits}/></section>}{job.careerPlan&&<section><h2>Plano de carreira</h2><RichContent value={job.careerPlan}/></section>}{(job.contactEmail||job.contactPhone||job.contactWhatsapp)&&<section><h2>Informações de contato</h2>{job.contactEmail&&<p><a href={'mailto:'+job.contactEmail}>{job.contactEmail}</a></p>}{job.contactPhone&&<p>Telefone: {job.contactPhone}</p>}{job.contactWhatsapp&&<p>WhatsApp: {job.contactWhatsapp}</p>}</section>}{job.teamDescription&&<section><h2>Sobre o time</h2><p>{job.teamDescription}</p></section>}{!!job.branches?.length&&<section><h2>Onde você vai trabalhar</h2><p>Esta oportunidade atende {job.branches.length===1?"a unidade abaixo":"as seguintes unidades"}.</p>{job.branches.map(branch=><section key={branch.id}><h3>{branch.name}</h3><p>{[branch.street,branch.number,branch.district,branch.city,branch.state].filter(Boolean).join(", ")}</p>{branch.description&&<p>{branch.description}</p>}<a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([branch.street,branch.number,branch.city,branch.state].join(", "))}`} target="_blank" rel="noopener noreferrer">Ver localização</a></section>)}</section>}<p>O recebimento de candidaturas pelo portal ainda não está disponível.</p><a href={`https://wa.me/?text=${encodeURIComponent(`${job.title} · ${portal.displayName}\n${new URL(path,searchEnvironment().origin).href}`)}`} target="_blank" rel="noopener noreferrer">Compartilhar no WhatsApp</a></Panel></main>;
}

