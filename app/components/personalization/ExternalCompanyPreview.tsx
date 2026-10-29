"use client";
import Link from "next/link";
import {useEffect,useState} from 'react';
import {customizationService} from './personalization-service';
import {PreviewContent} from './AppearancePreview';
import {brandingStyle} from './branding-model';

import {PreviewDock,WorkspaceState,useThemePreference} from '../ui';
import type {Customization} from './personalization-types';
export function ExternalCompanyPreview(){
 const [result,setResult]=useState<Customization|null>(null),[error,setError]=useState(''),[editable,setEditable]=useState(false);const {theme:preference}=useThemePreference();const [choice,setChoice]=useState<"light"|"dark"|null>(null);const theme=choice??(result?.theme.defaultMode==="system"?preference:result?.theme.defaultMode??preference);
 useEffect(()=>{let active=true;void customizationService.load().then(row=>{if(active){setResult(row.draft);setEditable(row.editable)}}).catch(()=>{if(active)setError('Entre com uma conta empresarial autorizada para visualizar sua personalização.')});return()=>{active=false}},[]);
 if(error)return <main className="jf-panel-body jf-workspace-stack"><WorkspaceState kind="forbidden" title="Prévia indisponível" description={error} action={<Link className="jf-action jf-action--secondary" href="/login?next=%2Fapp%2Fpersonalizacao%2Fprevia">Entrar</Link>}/></main>;
 if(!result)return <WorkspaceState title="Carregando prévia da empresa…"/>;
 return <main className="company-branding jf-external-preview" style={brandingStyle(result,theme)}><PreviewDock label={`Prévia privada · ${editable?"rascunho salvo":"publicada"} · mock`}/><PreviewContent surface="portal" data={result} theme={theme} onThemeChange={setChoice}/></main>;
}
