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

const streamCode=ts.transpileModule(readFileSync(new URL('../app/components/jobs/chat-stream.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {jsonFrames,partialReply}=await import('data:text/javascript;base64,'+Buffer.from(streamCode).toString('base64'));
test('chat decodes arbitrary frame boundaries and never exposes the proposed patch as prose',()=>{
 const object={type:'item',content:'Olá {"nome"} \\ teste 👋'},wire='data: '+JSON.stringify(object)+'\n'+JSON.stringify({type:'end'});
 for(let split=1;split<wire.length;split++){const parser=jsonFrames();assert.deepEqual([...parser(wire.slice(0,split)),...parser(wire.slice(split))],[object,{type:'end'}])}
 const reply='Olá\nQual filial? "Centro" 👋',source=JSON.stringify({reply,patch:{title:'Segredo do formulário'}});
 assert.equal(partialReply(source),reply);assert.equal(partialReply('{"reply":"Ol\\u00'), 'Ol');
 const parser=jsonFrames();assert.throws(()=>parser('x'.repeat(100001)));
});
