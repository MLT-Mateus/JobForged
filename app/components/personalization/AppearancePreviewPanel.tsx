"use client";
import {useState} from 'react';
import {Monitor,Tablet,Smartphone} from 'lucide-react';
import {ActionButton,SelectField,ViewportPreview} from '../ui';
import {brandingStyle} from './branding-model';
import {PreviewContent} from './AppearancePreview';
import type {Customization,PreviewSurface} from './personalization-types';
import './personalization.css';
const devices=[{id:'desktop',label:'Desktop',width:1200,height:800,icon:Monitor},{id:'tablet',label:'Tablet',width:820,height:1024,icon:Tablet},{id:'mobile',label:'Celular',width:390,height:844,icon:Smartphone}];
const surfaces:[PreviewSurface,string][]=[['portal','Portal de vagas'],['vaga','Página da vaga'],['painel','Painel'],['home','Home'],['login','Login']];
export function AppearancePreviewPanel({data,theme,onThemeChange}:{data:Customization;theme:'light'|'dark';onThemeChange:(theme:'light'|'dark')=>void}){
 const [preview,setPreview]=useState<PreviewSurface>('portal'),[device,setDevice]=useState('desktop');
 return <aside className="appearance-preview-panel"><header><div><b>Prévia do candidato</b><span>Atualiza enquanto você edita · mock</span></div><ActionButton variant="quiet" onClick={()=>onThemeChange(theme==='light'?'dark':'light')} aria-label="Alternar tema da prévia">{theme==='light'?'Escuro':'Claro'}</ActionButton></header><div className="appearance-preview-controls"><div role="group" aria-label="Dispositivo da prévia">{devices.map(({id,label,icon:Icon})=><ActionButton variant="quiet" aria-pressed={device===id} onClick={()=>setDevice(id)} key={id} aria-label={`Visualizar em ${label}`}><Icon/>{label}</ActionButton>)}</div><SelectField className="jf-field--compact-label" label="Página da prévia" value={preview} onValueChange={value=>setPreview(value as PreviewSurface)} options={surfaces.map(([value,label])=>({value,label}))}/></div><ViewportPreview width={devices.find(item=>item.id===device)?.width??1200} height={devices.find(item=>item.id===device)?.height??800} theme={theme}><div className="company-branding" style={brandingStyle(data,theme)}><PreviewContent surface={preview} data={data} theme={theme}/></div></ViewportPreview></aside>;
}
