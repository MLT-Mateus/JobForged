import assert from 'node:assert/strict';
import test from 'node:test';
import {loadTs} from './load-ts-module.mjs';
const {emptyJob}=await loadTs(new URL('../app/components/jobs/job-types.ts',import.meta.url));
const {editorChecks,publicationIssues,normalizeJob,sectionIndex,applicationFeedback}=await loadTs(new URL('../app/components/jobs/job-editor-model.ts',import.meta.url));
export const complete={...emptyJob('company'),title:'Analista',area:'Tecnologia',contractType:'Efetivo - CLT',modality:'Remoto',remoteScope:'Brasil',branchIds:['unit'],city:'Brasília',state:'DF',journey:'Flexível',description:'Atendimento a clientes.',attributions:'Responder chamados.',requirements:['Comunicação escrita'],lgpd:true,portalReady:true};
test('ten essentials; salary, level, benefits and accessibility are optional',()=>{
 assert.equal(editorChecks(complete).length,10);assert.deepEqual(publicationIssues(complete),[]);
 for(const key of ['title','area','contractType','modality','remoteScope','journey','description','attributions','requirements','positions']){const value=key==='requirements'?[]:key==='positions'?0:'';assert.equal(editorChecks({...complete,[key]:value}).filter(c=>!c.done).length,1,key)}
 assert.equal(editorChecks({...complete,requirements:[],noPrerequisites:true}).every(c=>c.done),true);
 assert.equal(editorChecks({...complete,modality:'Presencial',branchIds:[],city:'Brasília',state:'DF'}).find(c=>c.key==='branchIds').done,false);
 assert.equal(editorChecks({...complete,journey:'Escala',schedule:''}).find(c=>c.key==='journey').done,false);
 assert.equal(editorChecks({...complete,contractType:'invented'}).find(c=>c.key==='contractType').done,false);
 assert.equal(editorChecks({...complete,journey:'invented'}).find(c=>c.key==='journey').done,false);
 assert.equal(normalizeJob({...complete,contractType:'PJ'}).contractType,'Prestador de Serviço');
});
test('publication conditions are separate and malformed optional data can be removed',()=>{
 assert.deepEqual(publicationIssues({...complete,example:true,lgpd:false,portalReady:false}).map(i=>i.key),['lgpd','example','portal']);
 for(const patch of [{salaryMin:'2000',salaryMax:'1000'},{applicationDeadline:'2030-02-30'},{contactEmail:'invalid'},{contactPhone:'12'},{description:'<p>&nbsp;</p>'},{description:'\n\t '},{description:'x'.repeat(5001)},{careerPlan:'x'.repeat(5001)},{title:'x'.repeat(121)}])assert.ok(publicationIssues({...complete,...patch}).length);
 assert.deepEqual(publicationIssues({...complete,salaryMin:'',salaryMax:'',applicationDeadline:'',contactEmail:'',contactPhone:''}),[]);
});
test('normalization and feedback use applied content; legacy routes survive',()=>{
 const current=normalizeJob({...complete,description:'<b>Suporte</b>',attributions:'Responder\nOrientar',modality:'Home Office'});
 assert.equal(current.summary,'Suporte');assert.deepEqual(current.responsibilities,['Responder','Orientar']);assert.equal(current.modality,'Remoto');assert.deepEqual(current.stages,[]);
 assert.match(applicationFeedback(current),/10 dados essenciais/);assert.match(applicationFeedback({...current,requirements:[],noPrerequisites:false}),/requisitos/);
 assert.doesNotMatch(applicationFeedback(current),/falta.*salário/i);
 assert.deepEqual(['sobre','atribuicoes','beneficios','perfil','processo','revisao'].map(sectionIndex),[0,1,1,1,2,2]);
});
