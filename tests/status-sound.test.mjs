import assert from 'node:assert/strict';
import test from 'node:test';
import {setImmediate} from 'node:timers/promises';
import {playStatusSound} from '../app/components/ui/status-sound.ts';

test('não toca depois que o alerta sumiu, toca para o atual e respeita som desativado',async t=>{
 const oldWindow=globalThis.window,oldFetch=globalThis.fetch;
 t.after(()=>{globalThis.fetch=oldFetch;if(oldWindow===undefined)delete globalThis.window;else globalThis.window=oldWindow});
 let played=0,muted=false,current=true,resolveFetch;
 class AudioContext{
  resume(){return Promise.resolve()}
  decodeAudioData(){return Promise.resolve({})}
  createBufferSource(){return {connect(){},start(){played++}}}
 }
 globalThis.window={AudioContext,localStorage:{getItem:()=>muted?'off':'on'}};
 globalThis.fetch=()=>new Promise(resolve=>{resolveFetch=resolve});
 playStatusSound('info',()=>current);await setImmediate();assert.ok(resolveFetch);
 current=false;resolveFetch({ok:true,arrayBuffer:async()=>new ArrayBuffer(0)});await setImmediate();assert.equal(played,0);
 current=true;globalThis.fetch=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(0)});
 playStatusSound('success',()=>current);await setImmediate();assert.equal(played,1);
 muted=true;playStatusSound('danger',()=>current);await setImmediate();assert.equal(played,1);
});
