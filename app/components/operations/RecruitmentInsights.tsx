"use client";
import {useState} from 'react';
import {Panel,PanelHeading,MetricCard,ActionButton,StatusBadge} from '../ui';
import {MetricGrid} from '../ui/MetricGrid';
import {RecruitmentBarChart} from '../ui/RecruitmentBarChart';
import {stages,type Operations} from './model';
export function RecruitmentInsights({data}:{data:Operations}){
 const [demo,setDemo]=useState(false);
 if(!data.metrics)return <Panel><div className="jf-panel-body">Você não possui permissão para visualizar os indicadores.</div></Panel>;
 const metrics=demo?{published:12,applications:186,interviews:24,hired:8}:data.metrics;
 const distribution=stages.map((label,i)=>({label,value:demo?[54,62,26,4,24,8,6,2][i]:data.metrics?.stages[label]||0}));
 const now=new Date();const months=Array.from({length:6},(_,i)=>{const date=new Date(now.getFullYear(),now.getMonth()-5+i,1);return {key:date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0'),label:date.toLocaleDateString('pt-BR',{month:'short'}).replace('.','')};});
 const volume=months.map((m,i)=>({label:m.label,value:demo?[18,26,34,29,41,38][i]:data.applications.filter(a=>a.createdAt.slice(0,7)===m.key).length}));
 const jobs=demo?[{label:'Analista de RH',value:54},{label:'Assistente administrativo',value:48},{label:'Atendimento',value:36},{label:'Comercial',value:28},{label:'Tecnologia',value:20}]:[...data.jobs].sort((a,b)=>b.applications-a.applications).slice(0,5).map(j=>({label:j.title,value:j.applications}));
 return <><div className="jf-workspace-toolbar"><ActionButton variant="secondary" onClick={()=>setDemo(!demo)}>{demo?'Ver dados da empresa':'Ver exemplo demonstrativo'}</ActionButton><StatusBadge tone={demo?'warning':'positive'}>{demo?'Demonstração · dados fictícios':'Dados da empresa'}</StatusBadge></div><MetricGrid>{[['Vagas publicadas',metrics.published],['Candidaturas',metrics.applications],['Entrevistas',metrics.interviews],['Contratações',metrics.hired]].map(([label,value])=><MetricCard key={label} label={String(label)} value={String(value)} detail={demo?'Exemplo demonstrativo':'Total da empresa'}/>)}</MetricGrid><div className="jf-workspace-grid"><Panel><PanelHeading title="Candidaturas por etapa" description="Distribuição atual das pessoas no processo."/><RecruitmentBarChart label="Quantidade em cada etapa" data={distribution}/></Panel><Panel><PanelHeading title="Evolução das candidaturas" description="Inscrições recebidas nos últimos seis meses, incluindo o mês atual."/><RecruitmentBarChart vertical label="Volume mensal de candidaturas" data={volume}/></Panel><Panel><PanelHeading title="Vagas com mais candidaturas" description="As cinco oportunidades com maior procura."/><RecruitmentBarChart label={jobs.length?'Candidaturas por vaga':'Sem candidaturas registradas'} data={jobs}/></Panel><Panel><PanelHeading title="Situação das vagas" description="Distribuição das oportunidades cadastradas."/><RecruitmentBarChart label="Vagas por situação" data={['Publicada','Rascunho','Pausada','Encerrada','Arquivada'].map((label,i)=>({label,value:demo?[12,4,2,5,1][i]:data.jobs.filter(j=>j.status===label).length}))}/></Panel></div></>;
}
