"use client";
import Link from "next/link";
import {useEffect,useState} from 'react';
import {customizationService} from './personalization-service';
import {companyPreviewSlug} from './preview-slug';
import {PreviewContent} from './AppearancePreview';
import {brandingStyle} from './branding-model';

import {InlineNotice,WorkspaceState,useThemePreference} from '../ui';
import type {Customization} from './personalization-types';
export function ExternalCompanyPreview({slug}:{slug:string}){
 const [result,setResult]=useState<{data:Customization;titles:string[]}|null>(null),[error,setError]=useState('');const {theme}=useThemePreference();
 useEffect(()=>{let active=true;void customizationService.load().then(row=>{if(companyPreviewSlug(row.published.displayName)!==slug)throw new Error('Esta prévia não corresponde à empresa da sessão.');let jobs:Array<{organizationId:string;status:string;title:string}>=[];try{const stored=JSON.parse(localStorage.getItem('jobforged.jobs.v1')||'[]');if(Array.isArray(stored))jobs=stored.slice(0,500).filter(j=>j&&j.organizationId===row.draft.organizationId&&typeof j.title==='string')}catch{/* No local preview available. */}if(active)setResult({data:row.draft,titles:jobs.filter(j=>j.status==='Publicada').map(j=>j.title)})}).catch(()=>{if(active)setError('Entre com uma conta da empresa para abrir esta prévia. O endereço deve corresponder ao nome salvo da empresa.')});return()=>{active=false}},[slug]);
 if(error)return <main className="jf-panel-body jf-workspace-stack"><WorkspaceState kind="forbidden" title="Prévia indisponível" description={error} action={<Link className="jf-action jf-action--secondary" href="/login">Entrar</Link>}/></main>;
 if(!result)return <WorkspaceState title="Carregando prévia da empresa…"/>;
 return <main className="company-branding jf-external-preview" style={brandingStyle(result.data,theme)}><InlineNotice>Prévia privada do rascunho salvo. Vagas demonstrativas deste navegador (mock); candidaturas e publicação pública ainda não estão disponíveis.</InlineNotice><Link href="/app/personalizacao" className="jf-action jf-action--secondary">Voltar à Aparência</Link><div className="preview-stage is-desktop"><PreviewContent surface="portal" data={result.data} theme={theme} jobTitles={result.titles}/></div></main>;
}
