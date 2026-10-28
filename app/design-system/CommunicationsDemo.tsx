"use client";
import {MetricGrid} from '../components/ui/MetricGrid';
import {MetricCard,Panel,PanelHeading,StatusBadge} from '../components/ui';
export function CommunicationsDemo(){return <div className="jf-workspace-stack"><Panel><PanelHeading title="Resumo com até quatro indicadores" action={<StatusBadge>mock</StatusBadge>}/><div className="jf-panel-body"><MetricGrid>{['Vagas','Candidaturas','Entrevistas','Equipe'].map((label,i)=><MetricCard key={label} label={label} value={[8,42,6,4][i]} detail="Dado demonstrativo · mock"/>)}</MetricGrid></div></Panel></div>}
