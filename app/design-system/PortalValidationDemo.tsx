"use client";
import {useState} from 'react';
import {SelectField,CheckboxField,ViewportPreview,EditorAccordion} from '../components/ui';
import {CareerPortalPreview} from '../components/personalization/CareerPortalPreview';
import {brandingDefaults,brandingStyle} from '../components/personalization/branding-model';
import {fontPairs,type FontPairId} from '../components/ui/font-pairs';
import type {AppearanceLayout} from '../components/personalization/personalization-types';

/** Repeatable synthetic acceptance surface. Never reads or writes a tenant. */
export function PortalValidationDemo(){
 const [layout,setLayout]=useState<AppearanceLayout>('classico'),[width,setWidth]=useState('390'),[theme,setTheme]=useState<'light'|'dark'>('light'),[font,setFont]=useState<FontPairId>('jobforged'),[long,setLong]=useState(false);
 const data=brandingDefaults('ds-portal-example','Empresa de exemplo');
 data.portal.layout=layout;data.typography.fontPair=font;
 if(long){data.portal.headline='Oportunidades para construir um futuro compartilhado, com pessoas e ideias diversas.';data.portal.introduction='Conheça nossa equipe, nossa cultura e as oportunidades para desenvolver sua trajetória profissional. '.repeat(8);data.portal.buttonText='Explore as oportunidades disponíveis';data.portal.navigation=[{label:'Oportunidades profissionais disponíveis',href:'#vagas'},{label:'Conheça nossa cultura e nossas pessoas',href:'#cultura'},{label:'Converse com nossa equipe de recrutamento',href:'#contato'}];data.portal.about='Uma cultura de colaboração, respeito e aprendizado contínuo. '.repeat(25);}
 return <EditorAccordion title="Validar templates e conteúdo"><div className="jf-workspace-stack"><p>Prévia local com conteúdo sintético. Compare tamanhos, fontes e textos sem publicar alterações.</p><div className="jf-workspace-grid"><SelectField label="Template em validação" value={layout} onValueChange={v=>setLayout(v as AppearanceLayout)} options={[['classico','Clássico'],['equipe','Equipe'],['panorama','Panorama'],['vagas','Foco nas vagas'],['essencial','Essencial']].map(([value,label])=>({value,label}))}/><SelectField label="Largura em validação" value={width} onValueChange={setWidth} options={['320','390','768','1280'].map(value=>({value,label:value+' px'}))}/><SelectField label="Tema em validação" value={theme} onValueChange={v=>setTheme(v as 'light'|'dark')} options={[{value:'light',label:'Claro'},{value:'dark',label:'Escuro'}]}/><SelectField label="Fonte em validação" value={font} onValueChange={v=>setFont(v as FontPairId)} options={fontPairs.map(p=>({value:p.id,label:p.label}))}/></div><CheckboxField label="Usar textos extensos" checked={long} onChange={e=>setLong(e.target.checked)}/><ViewportPreview title="Validação dos templates" width={Number(width)} height={844} theme={theme}><div className="company-branding" style={brandingStyle(data,theme)}><CareerPortalPreview data={data} theme={theme} onThemeChange={setTheme}/></div></ViewportPreview></div></EditorAccordion>;
}
