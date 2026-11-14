import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const source=readFileSync(new URL('../app/components/jobs/job-assistant-contract.ts',import.meta.url),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {validateAssistantPatch,assistantDraft}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
test('assistant can propose fields and multiple known branches, never identity, consent or publication',()=>{
 assert.deepEqual(validateAssistantPatch({title:'Enfermeiro',branchIds:['a','b','a']},['a','b']),{title:'Enfermeiro',branchIds:['a','b']});
 for(const patch of [{branchIds:['foreign']},{status:'Publicada'},{lgpd:true},{organizationId:'foreign'},{__proto__:null,constructor:'escape'},{requirements:'invalid'},{title:3},{summary:'x'.repeat(501)},{salaryMin:'-3'}])assert.throws(()=>validateAssistantPatch(patch,['a']));
 assert.deepEqual(assistantDraft({title:'A',organizationId:'secret',status:'Publicada',lgpd:true,responsibleId:'person'}),{title:'A'});
 assert.throws(()=>validateAssistantPatch(JSON.parse('{"__proto__":{"polluted":true}}'),[]));
});
