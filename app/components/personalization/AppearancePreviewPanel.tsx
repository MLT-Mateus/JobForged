"use client";
import {useState} from 'react';
import {Monitor,Tablet,Smartphone} from 'lucide-react';
import {ActionButton,SelectField} from '../ui';
import {brandingStyle} from './branding-model';
import {PreviewContent} from './AppearancePreview';
import type {Customization,PreviewSurface} from './personalization-types';
import './personalization.css';
const surfaces:[PreviewSurface,string][]=[['portal','Portal de vagas'],['vaga','Página da vaga'],['painel','Painel'],['home','Home'],['login','Login']];
export function AppearancePreviewPanel({data,theme,onThemeChange}:{data:Customization;theme:'light'|'dark';onThemeChange:(theme:'light'|'dark')=>void}){
 const [preview,setPreview]=useState<PreviewSurface>('portal'),[device,setDevice]=useState('desktop');
 return <aside className="appearance-preview-panel company-branding" style={brandingStyle(data,theme)}><header><div><b>Prévia do candidato</b><span>Dados ilustrativos · mock</span></div><ActionButton variant="quiet" onClick={()=>onThemeChange(theme==='light'?'dark':'light')} aria-label="Alternar tema da prévia">{theme==='light'?'Escuro':'Claro'}</ActionButton></header><div className="appearance-preview-controls"><div role="group" aria-label="Dispositivo da prévia">{([['desktop',Monitor],['tablet',Tablet],['mobile',Smartphone]] as const).map(([id,Icon])=><ActionButton variant="quiet" aria-pressed={device===id} onClick={()=>setDevice(id)} key={id} aria-label={`Visualizar em ${id}`}><Icon/></ActionButton>)}</div><SelectField className="jf-field--compact-label" label="Página da prévia" value={preview} onValueChange={value=>setPreview(value as PreviewSurface)} options={surfaces.map(([value,label])=>({value,label}))}/></div><div className={`preview-stage is-${device}`}><PreviewContent surface={preview} data={data} theme={theme}/></div></aside>;
}
