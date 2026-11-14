import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
async function load(path){const source=readFileSync(new URL(path,import.meta.url),'utf8');return import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText).toString('base64'))}
const {emptyJob}=await load('../app/components/jobs/job-types.ts');
const {editorChecks,reconcileStages}=await load('../app/components/jobs/job-editor-model.ts');
test('publication checklist matches required identification and leaves requirements optional',()=>{
 const job={...emptyJob('company'),title:'Cargo',area:'Área',level:'Pleno',pcd:'Disponível para PCD',salaryRange:'Salário a combinar',contractType:'CLT',modality:'Presencial',journey:'Matutino',branchIds:['a'],city:'Brasília',state:'DF',summary:'Descrição',responsibilities:['Atender clientes'],requirements:[],lgpd:true};
 assert.equal(editorChecks(job).every(x=>x.done),true);
 for(const key of ['pcd','journey','salaryRange'])assert.equal(editorChecks({...job,[key]:''}).every(x=>x.done),false);
 assert.equal(editorChecks({...job,branchIds:[]}).every(x=>x.done),false);
 assert.equal(editorChecks({...job,salaryRange:'Informar valores',salaryMin:''}).every(x=>x.done),false);
 assert.equal(editorChecks({...job,salaryRange:'Informar valores',salaryMin:'1500'}).every(x=>x.done),true);
});
test('stage identity survives reorder, deletion and renaming',()=>{
 const a={id:'a',name:'Triagem',required:false},b={id:'b',name:'Entrevista',required:true};
 assert.deepEqual(reconcileStages([a,b],['Entrevista','Triagem']),[b,a]);
 assert.deepEqual(reconcileStages([a,b],['Triagem inicial','Entrevista']),[{...a,name:'Triagem inicial'},b]);
 assert.deepEqual(reconcileStages([a,b],['Entrevista']),[b]);
});
