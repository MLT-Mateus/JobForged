import assert from 'node:assert/strict';
import test from 'node:test';
import {loadTs} from './load-ts-module.mjs';
const {emptyJob}=await loadTs(new URL('../app/components/jobs/job-types.ts',import.meta.url));
const {validateAssistantResponse}=await loadTs(new URL('../app/components/jobs/assistant-response.ts',import.meta.url));
const {decisionRequired,reasonRequired}=await loadTs(new URL('../app/components/operations/pipeline.ts',import.meta.url));
const complete={title:'Atendimento',area:'Atendimento',contractType:'Efetivo - CLT',modality:'Remoto',remoteScope:'Brasil',journey:'Flexível',positions:1,description:'Atendimento aos clientes.',attributions:'Responder chamados.',requirements:['Comunicação clara']};
const response=(patch,intent='create_example')=>({reply:'Preparei uma proposta para revisão.',intent,patch,objective:'Vaga completa',origins:Object.fromEntries(Object.keys(patch).map(k=>[k,intent==='create_example'?'example':'user'])),coverage:{completed:['Proposta'],missing:[]}});
test('complete mock must contain every essential and remains non-publishable after partial application',()=>{
 const value=validateAssistantResponse(response(complete),[],emptyJob());assert.equal(value.patch.example,true);
 assert.throws(()=>validateAssistantResponse(response({title:'Mock'}),[],emptyJob()),/essenciais/);
 assert.throws(()=>validateAssistantResponse(response({example:false},'update_fields'),[],emptyJob()));
 for(const patch of [{lgpd:true},{status:'Publicada'},{organizationId:'other'},{branchIds:['foreign']},{positions:0},{languages:[{language:4,level:'x'}]}])assert.throws(()=>validateAssistantResponse(response(patch,'update_fields'),[],emptyJob()));
});
test('focused edits preserve scope; provenance cannot be omitted or masquerade as persistence',()=>{
 const single=validateAssistantResponse(response({title:'Novo título'},'update_fields'),[],emptyJob());assert.deepEqual(single.patch,{title:'Novo título'});
 assert.throws(()=>validateAssistantResponse({...response({title:'A'}),origins:{}},[],emptyJob()));
 assert.throws(()=>validateAssistantResponse({...response(complete),coverage:{completed:'wrong',missing:[]}},[],emptyJob()));
 assert.equal(validateAssistantResponse(response({},'explain'),[],emptyJob()).intent,'explain');
});
test('decision and reason matrix covers approval, reopening and finalized contracts',()=>{
 const card={stageKey:'screening',outcome:'active'};
 assert.equal(decisionRequired(card,'interview'),false);assert.equal(decisionRequired(card,'approved'),true);assert.equal(reasonRequired(card,'approved'),true);
 assert.equal(reasonRequired({...card,stageKey:'interview'},'approved'),false);
 assert.equal(reasonRequired(card,'screening','rejected'),true);
 assert.equal(decisionRequired({...card,outcome:'rejected'},'screening'),true);
 assert.equal(reasonRequired({...card,stageKey:'hired'},'screening'),true);
});
