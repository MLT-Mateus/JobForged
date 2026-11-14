import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const source=readFileSync(new URL('../app/components/jobs/job-path.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {jobPath}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
const id='31000000-0000-4000-8000-000000000041';
test('public job links preserve company and stable identifier with readable Portuguese titles',()=>{
 assert.equal(jobPath('empresa-a',{id,title:'Técnico de Enfermagem'}),`/vagas/empresa-a/tecnico-de-enfermagem-${id}`);
 assert.notEqual(jobPath('empresa-a',{id,title:'Analista'}),jobPath('empresa-b',{id,title:'Analista'}));
 assert.equal(jobPath('empresa-a',{id,title:'🎯'}),`/vagas/empresa-a/oportunidade-${id}`);
 assert.ok(jobPath('empresa-a',{id,title:'A'.repeat(500)}).endsWith(id));
 assert.ok(!jobPath('empresa-a',{id,title:'../<script>?x=#'}).includes('<'));
});
