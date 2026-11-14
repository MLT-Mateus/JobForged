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

test('voice capture pauses, resumes, completes once and releases the microphone',async()=>{
 const cleanups=[];let audio=null,stopped=0,current;
 const originalNav=Object.getOwnPropertyDescriptor(globalThis,'navigator'),originalRecorder=globalThis.MediaRecorder;
 globalThis.__voiceTestHooks={useRef:value=>({current:value}),useState:value=>[value,()=>{}],useEffect:fn=>{const cleanup=fn();if(cleanup)cleanups.push(cleanup)}};
 class Recorder{static isTypeSupported(){return true}constructor(){current=this;this.state='inactive'}start(){this.state='recording'}pause(){this.state='paused'}resume(){this.state='recording'}stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['a'.repeat(200)])});this.onstop?.()}}
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia:async()=>({getTracks:()=>[{stop(){stopped++}}]})}}});globalThis.MediaRecorder=Recorder;
 try{
  const source=readFileSync(new URL('../app/components/jobs/use-voice-capture.ts',import.meta.url),'utf8').replace("import {useEffect,useRef,useState} from 'react';","const {useEffect,useRef,useState}=globalThis.__voiceTestHooks;");
  const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
  const {useVoiceCapture}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
  const voice=useVoiceCapture(file=>{assert.equal(audio,null);audio=file},message=>assert.fail(message));
  await voice.start();assert.equal(current.state,'recording');voice.togglePause();assert.equal(current.state,'paused');voice.togglePause();assert.equal(current.state,'recording');voice.togglePause();voice.stop();assert.equal(current.state,'inactive');assert.equal(audio.type,'audio/webm');assert.equal(stopped,1);
  audio=null;await voice.start();voice.cancel();assert.equal(audio,null);assert.equal(stopped,2);
 }finally{cleanups.forEach(fn=>fn());delete globalThis.__voiceTestHooks;if(originalNav)Object.defineProperty(globalThis,'navigator',originalNav);else delete globalThis.navigator;globalThis.MediaRecorder=originalRecorder}
});
