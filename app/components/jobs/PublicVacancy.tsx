"use client";
import Link from 'next/link';
import {BrandAsset} from '../BrandAsset';
import {ActionButton,Panel,ThemeSelector,useThemePreference} from '../ui';
import {brandingLogo,brandingStyle} from '../personalization/branding-model';
import type {Customization} from '../personalization/personalization-types';
import {PublicPortalAccount} from '../personalization/PublicPortalAccount';
import {ApplicationAction} from '../operations/ApplicationAction';
import {JobDescription} from './JobDescription';
import type {PublicJob} from './PublicJobs';
export function PublicVacancy({portal,job,slug}:{portal:Customization;job:PublicJob;slug:string}){
 const preference=useThemePreference(),theme=portal.theme.allowSwitch?preference.theme:portal.theme.defaultMode==='system'?preference.theme:portal.theme.defaultMode==='dark'?'dark':'light';
 return <main className="company-branding public-vacancy" style={brandingStyle(portal,theme)}><header className="jf-vacancy-navigation"><Link href={'/'+slug} aria-label={'Vagas de '+portal.displayName}><BrandAsset src={brandingLogo(portal,theme)} alt={portal.displayName}/></Link><div>{portal.theme.allowSwitch&&<ThemeSelector theme={theme} onChange={preference.changeTheme}/>}<PublicPortalAccount slug={slug}/></div></header><Link href={'/'+slug}>← Todas as vagas</Link><Panel><header><p>{portal.displayName}</p><h1>{job.title}</h1><p>{[job.area,job.level,job.contractType,job.modality,[job.city,job.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}</p></header><JobDescription job={job}/><ApplicationAction jobId={job.id} slug={slug}/><ActionButton variant="secondary" onClick={()=>{const url=window.location.href;if(navigator.share)void navigator.share({title:job.title,url}).catch(()=>{});else window.open('https://wa.me/?text='+encodeURIComponent(job.title+' — '+url),'_blank','noopener,noreferrer')}}>Compartilhar</ActionButton></Panel></main>;
}
