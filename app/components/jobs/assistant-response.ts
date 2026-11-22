import {validateAssistantPatch,type AssistantPatch} from './job-assistant-contract';
import {editorChecks,normalizeJob} from './job-editor-model';
import type {Job} from './job-types';

export const assistantIntents=['create_real','create_example','update_fields','complete_missing','rewrite','explain'] as const;
type Intent=typeof assistantIntents[number];
type Origin='user'|'current'|'document'|'suggestion'|'example';
export type AssistantResponse={reply:string;patch:AssistantPatch;intent:Intent;objective:string;origins:Record<string,Origin>;coverage:{completed:string[];missing:string[]}};
/** Provider output is an untrusted proposal; it cannot change consent or publish. */
export function validateAssistantResponse(value:unknown,branches:string[],draft:Job):AssistantResponse{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Resposta inválida.');
 const data=value as Record<string,unknown>;
 if(typeof data.reply!=='string'||!data.reply.trim()||data.reply.length>4000)throw Error('Resposta inválida.');
 if(!assistantIntents.includes(data.intent as Intent))throw Error('Intenção inválida.');
 const patch=validateAssistantPatch(data.patch,branches);
 if(patch.example===false)throw Error('A conversão em vaga real exige revisão no formulário.');
 if(data.intent==='create_example'){
  patch.example=true;
  if(editorChecks(normalizeJob({...draft,...patch})).some(c=>!c.done))throw Error('O exemplo não contém todos os dados essenciais.');
 }
 const origins:Record<string,Origin>={};
 if(!data.origins||typeof data.origins!=='object'||Array.isArray(data.origins))throw Error('Origem da proposta ausente.');
 for(const key of Object.keys(patch)){
  const source=(data.origins as Record<string,unknown>)[key];
  if(key==='example'&&data.intent==='create_example'){origins[key]='example';continue}
  if(!['user','current','document','suggestion','example'].includes(String(source)))throw Error('Origem inválida.');
  origins[key]=source as Origin;
 }
 if(Object.values(origins).includes('example'))patch.example=true;
 const coverage=data.coverage as {completed?:unknown;missing?:unknown};
 if(!coverage||!['completed','missing'].every(k=>Array.isArray(coverage[k as keyof typeof coverage])&&(coverage[k as keyof typeof coverage] as unknown[]).length<=30&&(coverage[k as keyof typeof coverage] as unknown[]).every(v=>typeof v==='string'&&v.length<=200)))throw Error('Cobertura inválida.');
 if(typeof data.objective!=='string'||data.objective.length>1000)throw Error('Objetivo inválido.');
 return {reply:data.reply,patch,intent:data.intent as Intent,objective:data.objective,origins,coverage:coverage as AssistantResponse['coverage']};
}
