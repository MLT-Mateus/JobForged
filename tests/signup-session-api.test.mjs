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
