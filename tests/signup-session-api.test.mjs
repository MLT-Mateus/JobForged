import test from 'node:test';
import assert from 'node:assert/strict';

test('signup issues HttpOnly session, clears recovery and preserves confirmation fallback',async()=>{
 const original=globalThis.fetch;const previous={...process.env};let confirm=false;
 process.env.SUPABASE_INTERNAL_URL='http://signup-fixture.invalid';process.env.SUPABASE_ANON_KEY='fixture';delete process.env.BREVO_API_KEY;
 globalThis.fetch=async(input)=>{const path=new URL(String(input)).pathname;
  if(path.endsWith('/rpc/create_company_signup_intent'))return Response.json('a'.repeat(64));
  if(path==='/auth/v1/signup')return Response.json(confirm?{user:{id:'fixture'}}:{access_token:'access-fixture',refresh_token:'refresh-fixture',expires_in:900,user:{id:'fixture'}});
  throw new Error('Unexpected signup fixture operation');
 };
 try{
 const {default:worker}=await import('../dist/server/index.js');
 const body={responsible:'Signup fixture',company:'Fixture company',cnpj:'11222333000181',phone:'11999999999',email:'signup@example.invalid',password:'Fixture9!Example',confirmPassword:'Fixture9!Example',acceptedTerms:true};
 const send=origin=>worker.fetch(new Request('http://localhost/api/auth/sign-up',{method:'POST',headers:{host:'localhost',origin,'content-type':'application/json'},body:JSON.stringify(body)}),{ASSETS:{fetch:()=>new Response('',{status:404})}},{waitUntil(){},passThroughOnException(){}});
 assert.equal((await send('https://foreign.invalid')).status,403);
 const response=await send('http://localhost');assert.equal(response.status,200);assert.equal((await response.json()).requiresConfirmation,false);
 const cookies=response.headers.get('set-cookie');assert.match(cookies,/jf_auth_access=access-fixture/);assert.match(cookies,/jf_auth_refresh=refresh-fixture/);assert.match(cookies,/HttpOnly/);assert.match(cookies,/jf_password_recovery=;.*Max-Age=0/);
 confirm=true;const fallback=await send('http://localhost');assert.equal((await fallback.json()).requiresConfirmation,true);assert.equal(fallback.headers.get('set-cookie'),null);
 }finally{globalThis.fetch=original;for(const key of ['SUPABASE_INTERNAL_URL','SUPABASE_ANON_KEY','BREVO_API_KEY']){if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key]}}
});

test('email changes immediately through authenticated password authorization, clears cookies and never sends email',async()=>{
 const original=globalThis.fetch,previous={...process.env};let calls=0,code=null;
 process.env.SUPABASE_INTERNAL_URL='http://email-fixture.invalid';process.env.SUPABASE_ANON_KEY='fixture';
 globalThis.fetch=async(input,init)=>{
  const path=new URL(String(input)).pathname;
  if(path==='/auth/v1/user'&&(!init.method||init.method==='GET'))return Response.json({id:'fixture',email:'old@example.invalid',email_confirmed_at:'2026-01-01'});
  if(path.endsWith('/rpc/is_platform_admin'))return Response.json(false);
  if(path.endsWith('/rpc/session_context_v1'))return Response.json({company_id:'company',role:'owner',companies:{id:'company',name:'Fixture'}});
  if(path.endsWith('/rpc/change_my_login_email')){
   calls++;assert.deepEqual(JSON.parse(init.body),{new_email:'new@example.invalid',current_password:'Fixture9!Password'});
   return code?Response.json({code},{status:code==='PT401'?401:409}):Response.json({email:'new@example.invalid'});
  }
  throw new Error('Email flow attempted unexpected operation: '+path);
 };
 try{
  const {default:worker}=await import('../dist/server/index.js');
  const body={operation:'email',email:' NEW@example.invalid ',confirmation:'new@example.invalid',currentPassword:'Fixture9!Password'};
  const send=(data=body,origin='http://localhost')=>worker.fetch(new Request('http://localhost/api/account/credentials',{method:'POST',headers:{host:'localhost',origin,cookie:'jf_auth_access=fixture','content-type':'application/json'},body:JSON.stringify(data)}),{ASSETS:{fetch:()=>new Response('',{status:404})}},{waitUntil(){},passThroughOnException(){}});
  assert.equal((await send(body,'https://foreign.invalid')).status,403);
  assert.equal((await send({...body,currentPassword:''})).status,400);
  assert.equal((await send({...body,confirmation:'different@example.invalid'})).status,400);
  assert.equal(calls,0);
  code='PT401';const wrong=await send();assert.equal(wrong.status,400);assert.match((await wrong.json()).message,/senha atual/);assert.equal(wrong.headers.get('set-cookie'),null);
  code='23505';assert.equal((await send()).status,409);
  code=null;const success=await send();assert.equal(success.status,200);assert.deepEqual(await success.json(),{ok:true,email:'new@example.invalid'});
  assert.match(success.headers.get('set-cookie'),/jf_auth_access=;.*Max-Age=0/);assert.match(success.headers.get('set-cookie'),/jf_auth_refresh=;.*Max-Age=0/);
 }finally{globalThis.fetch=original;for(const key of ['SUPABASE_INTERNAL_URL','SUPABASE_ANON_KEY']){if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key]}}
});
