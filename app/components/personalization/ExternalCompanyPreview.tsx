"use client";
import Link from "next/link";
import {useEffect,useState} from 'react';
import {customizationService} from './personalization-service';
import {PreviewContent} from './AppearancePreview';
import {brandingStyle} from './branding-model';

import {InlineNotice,WorkspaceState,useThemePreference} from '../ui';
import type {Customization} from './personalization-types';
export function ExternalCompanyPreview(){
 const [result,setResult]=useState<Customization|null>(null),[error,setError]=useState('');const {theme}=useThemePreference();
 useEffect(()=>{let active=true;void customizationService.load().then(row=>{if(active)setResult(row.draft)}).catch(()=>{if(active)setError('Entre com uma conta empresarial autorizada para visualizar sua personalização.')});return()=>{active=false}},[]);
 if(error)return <main className="jf-panel-body jf-workspace-stack"><WorkspaceState kind="forbidden" title="Prévia indisponível" description={error} action={<Link className="jf-action jf-action--secondary" href="/login?next=%2Fapp%2Fpersonalizacao%2Fprevia">Entrar</Link>}/></main>;
 if(!result)return <WorkspaceState title="Carregando prévia da empresa…"/>;
 return <main className="company-branding jf-external-preview" style={brandingStyle(result,theme)}><InlineNotice>Prévia privada da personalização da sua empresa. Conteúdo ilustrativo (mock); candidaturas e publicação pública ainda não estão disponíveis.</InlineNotice><Link href="/app/personalizacao" className="jf-action jf-action--secondary">Voltar à Aparência</Link><div className="preview-stage is-desktop"><PreviewContent surface="portal" data={result} theme={theme}/></div></main>;
}
