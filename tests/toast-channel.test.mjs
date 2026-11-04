import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { ToastChannel } from '../app/components/ui/toast-channel.ts';
const notice = {kind:'info',title:'Atualização',text:'Resultado da ação'};
test('substitui feedback entre produtores e limpa apenas o proprietário anterior',()=>{
 const channel=new ToastChannel();let closedA=0,closedB=0;
 channel.registerClose('a',()=>closedA++);channel.registerClose('b',()=>closedB++);
 channel.publish('a',notice);channel.publish('b',notice);
 assert.equal(channel.getSnapshot().owner,'b');assert.equal(closedA,1);assert.equal(closedB,0);
 channel.release('a');assert.equal(channel.getSnapshot().owner,'b');
});
test('temporizador antigo não fecha um alerta mais recente, mesmo com texto igual',()=>{
 const channel=new ToastChannel();let closed=0;channel.registerClose('a',()=>closed++);
 channel.publish('a',notice);const first=channel.getSnapshot().serial;channel.publish('a',notice);
 const current=channel.getSnapshot().serial;assert.notEqual(first,current);assert.equal(closed,0);
 channel.dismiss(first);assert.equal(channel.getSnapshot().serial,current);
 channel.dismiss(current);assert.equal(channel.getSnapshot(),null);assert.equal(closed,1);
});
test('limpeza de callback antigo preserva callback atualizado e unsubscribe funciona',()=>{
 const channel=new ToastChannel();let old=0,current=0,updates=0;
 const unregister=channel.registerClose('a',()=>old++);channel.registerClose('a',()=>current++);unregister();
 const unsubscribe=channel.subscribe(()=>updates++);channel.publish('a',notice);unsubscribe();
 channel.dismiss(channel.getSnapshot().serial);assert.equal(old,0);assert.equal(current,1);assert.equal(updates,1);
});
