import assert from 'node:assert/strict';
import test from 'node:test';
test('candidate BFF uses validated intent, same-origin writes and own explicit contracts',async()=>{
 const original=globalThis.fetch,previous={url:process.env.SUPABASE_INTERNAL_URL,key:process.env.SUPABASE_ANON_KEY};
 process.env.SUPABASE_INTERNAL_URL='https://candidate.fixture.invalid';process.env.SUPABASE_ANON_KEY='fixture-anon';
 const calls=[];let conflict=false;
 globalThis.fetch=async(url,init)=>{const path=new URL(String(url)).pathname,body=init?.body?JSON.parse(init.body):null;calls.push({path,body});
 if(path==='/auth/v1/user')return Response.json({id:'35000000-0000-4000-8000-000000000001',email:'candidate@example.invalid',email_confirmed_at:'2026-10-29T00:00:00Z'});
 if(path.endsWith('/rpc/is_platform_admin'))return Response.json(false);
 if(path.endsWith('/rpc/session_context_v1'))return Response.json(null);
 if(path.endsWith('/rpc/candidate_context'))return Response.json({fullName:'Candidate fixture',version:0,slug:'fixture-company'});
 if(path.endsWith('/rpc/create_candidate_signup_intent'))return Response.json('a'.repeat(64));
 if(path==='/auth/v1/signup')return Response.json({id:'35000000-0000-4000-8000-000000000002'});
 if(path.endsWith('/rpc/candidate_account'))return conflict?Response.json({code:'40001'},{status:409}):Response.json({profile:{fullName:'Candidate fixture',version:0,slug:'fixture-company'},items:[]});
 throw new Error('Unexpected candidate fixture operation');};
 try{
 const {default:worker}=await import('../dist/server/index.js');
 const request=(path,body,cookie='jf_auth_access=fixture',origin='http://localhost')=>worker.fetch(new Request('http://localhost'+path,{method:body?'POST':'GET',headers:{host:'localhost',origin,cookie,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),{ASSETS:{fetch:()=>new Response('',{status:404})}},{waitUntil(){},passThroughOnException(){}});
 assert.equal((await request('/api/portal/account',null,'')).status,401);
 const profile=await request('/api/portal/account');assert.equal(profile.status,200);assert.deepEqual((await profile.json()).items,[]);
 assert.equal((await request('/api/company/portal')).status,403);
 assert.equal((await request('/api/portal/account',{operation:'profile',fullName:'Valid name',version:0},undefined,'https://foreign.invalid')).status,403);
 assert.equal((await request('/api/portal/account',{operation:'profile',fullName:'',version:0})).status,400);
 assert.equal((await request('/api/portal/account',{operation:'profile',fullName:'Valid name',version:0,companyId:'untrusted'})).status,200);
 assert.deepEqual(calls.filter(c=>c.path.endsWith('/rpc/candidate_account')).at(-1).body,{operation:'profile',expected_version:0,full_name:'Valid name',delivery_id:null,page_number:1});
 conflict=true;assert.equal((await request('/api/portal/account',{operation:'profile',fullName:'Valid name',version:0})).status,409);conflict=false;
 const signup={fullName:'Candidate fixture',email:'new@example.invalid',password:'Fixture9!Example',confirmPassword:'Fixture9!Example',acceptedTerms:true,slug:'fixture-company',role:'platform_admin'};
 assert.equal((await request('/api/auth/candidate-sign-up',{...signup,password:'weak'},'')).status,400);
 assert.equal((await request('/api/auth/candidate-sign-up',signup,'','https://foreign.invalid')).status,403);
 assert.equal((await request('/api/auth/candidate-sign-up',signup,'')).status,200);
 const auth=calls.find(c=>c.path==='/auth/v1/signup');assert.deepEqual(auth.body.data,{account_type:'candidate',candidate_signup_nonce:'a'.repeat(64)});
 }finally{globalThis.fetch=original;if(previous.url===undefined)delete process.env.SUPABASE_INTERNAL_URL;else process.env.SUPABASE_INTERNAL_URL=previous.url;if(previous.key===undefined)delete process.env.SUPABASE_ANON_KEY;else process.env.SUPABASE_ANON_KEY=previous.key}
});
