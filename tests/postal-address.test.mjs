import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const source=readFileSync(new URL('../app/api/address/route.ts',import.meta.url),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {GET}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
test('CEP lookup validates input and upstream data and handles unavailable services',async()=>{
 const original=globalThis.fetch;let calls=0;
 try{
  globalThis.fetch=async(url,options)=>{calls++;assert.equal(url,'https://viacep.com.br/ws/01001000/json/');assert.equal(options.redirect,'error');return Response.json({cep:'01001-000',logradouro:'Praça da Sé',bairro:'Sé',localidade:'São Paulo',uf:'SP',complemento:'lado ímpar',ibge:'private-unused'})};
  for(const cep of ['','123','abcdefgh','010010000','https://other.invalid'])assert.equal((await GET(new Request('https://test.invalid/api/address?cep='+encodeURIComponent(cep)))).status,400);
  assert.equal(calls,0);
  const ok=await GET(new Request('https://test.invalid/api/address?cep=01001000'));
  assert.deepEqual(await ok.json(),{postalCode:'01001000',street:'Praça da Sé',district:'Sé',city:'São Paulo',state:'SP'});
  globalThis.fetch=async()=>Response.json({erro:true});assert.equal((await GET(new Request('https://test.invalid/api/address?cep=99999999'))).status,404);
  globalThis.fetch=async()=>{throw Error('timeout')};assert.equal((await GET(new Request('https://test.invalid/api/address?cep=01001000'))).status,503);
  globalThis.fetch=async()=>Response.json({cep:'11111-111',localidade:'Other',uf:'SP'});assert.equal((await GET(new Request('https://test.invalid/api/address?cep=01001000'))).status,503);
  globalThis.fetch=async()=>Response.json({cep:'01001-000',localidade:'São Paulo',uf:'SP'});const general=await GET(new Request('https://test.invalid/api/address?cep=01001000'));assert.equal(general.status,200);assert.equal((await general.json()).street,'');
 }finally{globalThis.fetch=original}
});
