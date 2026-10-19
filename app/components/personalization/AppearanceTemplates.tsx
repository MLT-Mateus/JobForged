"use client";
import {ActionButton} from '../ui/AdminPrimitives';
import type {AppearanceLayout} from './personalization-types';
import './appearance-templates.css';
export const appearanceTemplates:ReadonlyArray<{id:AppearanceLayout;name:string;description:string}>=[
 {id:'classico',name:'Clássico',description:'Mensagem e imagem lado a lado'},
 {id:'equipe',name:'Equipe',description:'Imagem à esquerda, mensagem à direita'},
 {id:'panorama',name:'Panorama',description:'Capa ampla com mensagem em destaque'},
 {id:'vagas',name:'Foco nas vagas',description:'Apresentação curta e oportunidades próximas'},
 {id:'essencial',name:'Essencial',description:'Conteúdo centralizado e leitura leve'}];
export function AppearanceTemplatePicker({value,onChange,disabled=false}:{value:AppearanceLayout;disabled?:boolean;onChange:(value:AppearanceLayout)=>void}){
 return <div className="jf-appearance-templates" role="group" aria-label="Templates da página de vagas">{appearanceTemplates.map(t=><ActionButton key={t.id} variant="secondary" disabled={disabled} aria-pressed={value===t.id} onClick={()=>onChange(t.id)}><span className="jf-template-thumbnail" data-layout={t.id} aria-hidden="true"><i className="jf-template-thumbnail__nav"/><span className="jf-template-thumbnail__hero"><i/><b/></span><span className="jf-template-thumbnail__jobs"><i/><i/><i/></span></span><strong>{t.name}</strong><small>{t.description}</small></ActionButton>)}</div>;
}
