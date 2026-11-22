"use client";
import {useState} from 'react';
import {Panel,PanelHeading,RadioField,FormActions} from '../ui';
import {VacancyIdentity} from '../ui/KanbanBoard';
import {usePendingChanges} from '../ui/PendingChanges';
import {jobService} from './job-service';
import type {Job} from './job-types';
const colors=['Azul','Violeta','Turquesa','Âmbar','Rosa','Índigo','Oliva','Terracota','Petróleo','Malva','Dourado','Ardósia'];
export function JobColorPicker({job,onSaved,editable}:{job:Job;onSaved:(job:Job)=>void;editable:boolean}){
 const [value,setValue]=useState(job.colorToken??0),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const dirty=value!==(job.colorToken??0),guard=usePendingChanges(dirty);
 async function save(){if(busy||!dirty)return;setBusy(true);setError('');try{onSaved(await jobService.setColor(job,value))}catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar.')}finally{setBusy(false)}}
 return <Panel>{guard.dialog}<PanelHeading title="Identificação no quadro"/><div className="jf-panel-body jf-workspace-stack"><VacancyIdentity title={job.title} id={job.id} color={value}/><p>A cor identifica a vaga nas candidaturas. O nome e o código continuam visíveis.</p><fieldset disabled={!editable||busy} className="jf-fieldset"><legend>Cor da vaga</legend><div className="jf-vacancy-palette">{colors.map((label,i)=><RadioField key={label} label={label} name="vacancy-color" value={i} checked={value===i} onChange={()=>setValue(i)}/>)}</div></fieldset>{error&&<p role="alert">{error}</p>}{editable&&<FormActions dirty={dirty} busy={busy} onCancel={()=>setValue(job.colorToken??0)} onSave={()=>void save()}/>}</div></Panel>;
}
