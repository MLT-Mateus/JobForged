import assert from 'node:assert/strict';
import test from 'node:test';

test('administrative TOTP enrollment labels its issuer and protects one-time setup material', async () => {
 const previous={SUPABASE_INTERNAL_URL:process.env.SUPABASE_INTERNAL_URL,SUPABASE_ANON_KEY:process.env.SUPABASE_ANON_KEY,APP_ENV:process.env.APP_ENV};
 const originalFetch=globalThis.fetch;let invalid=true,enrollmentBody;
 const syntheticKey='A'.repeat(32);
 Object.assign(process.env,{SUPABASE_INTERNAL_URL:'https://supabase.fixture.invalid',SUPABASE_ANON_KEY:'fixture-anon',APP_ENV:'test'});
 globalThis.fetch=async(input,init)=>{
  const url=String(input);
  if(url.endsWith('/auth/v1/user'))return Response.json({id:'26000000-0000-0000-0000-000000000001',email:'fixture@example.invalid',email_confirmed_at:'2026-10-19T00:00:00Z',factors:[]});
  if(url.endsWith('/rpc/is_platform_admin'))return Response.json(true);
  if(url.endsWith('/rpc/security_status'))return Response.json({mfaEnforced:false,aal:'aal1',verifiedFactors:0});
  if(url.endsWith('/auth/v1/factors')){enrollmentBody=JSON.parse(init.body);return Response.json({id:'26000000-0000-0000-0000-000000000011',totp:{qr_code:'<svg xmlns="http://www.w3.org/2000/svg"/>',secret:syntheticKey}});}
  if(url.endsWith('/challenge'))return Response.json({id:'26000000-0000-0000-0000-000000000012'});
  if(url.endsWith('/verify'))return invalid?Response.json({error_code:'mfa_verification_failed'},{status:422}):Response.json({access_token:'fixture-aal2',refresh_token:'fixture-refresh',expires_in:900});
  throw Error('Unexpected request in isolated MFA fixture');
 };
 try{
  const {default:worker}=await import('../dist/server/index.js');
  const request=body=>worker.fetch(new Request('http://localhost/api/backoffice/security',{method:body?'POST':'GET',headers:{host:'localhost',origin:'http://localhost',cookie:'jf_auth_access=fixture-token','content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),{ASSETS:{fetch:()=>new Response('',{status:404})}},{waitUntil(){},passThroughOnException(){}});
  const enrolled=await request({operation:'enroll'});assert.equal(enrolled.status,200);assert.match(enrolled.headers.get('cache-control'),/private, no-store/);
  const setup=await enrolled.json();assert.equal(enrollmentBody.issuer,'JobForged Test');assert.equal(setup.issuer,'JobForged Test');assert.equal(setup.manualKey,syntheticKey);assert.match(setup.qr,/^data:image\/svg\+xml;base64,/);
  const status=await(await request()).json();assert.equal(status.manualKey,undefined);assert.equal(status.qr,undefined);
  const rejected=await request({operation:'verify',factorId:setup.factorId,code:'123456'});assert.equal(rejected.status,400);assert.match((await rejected.json()).message,/entrada JobForged/);assert.equal(rejected.headers.get('set-cookie'),null);
  invalid=false;const verified=await request({operation:'verify',factorId:setup.factorId,code:'123456'});assert.equal(verified.status,200);assert.match(verified.headers.get('set-cookie'),/jf_auth_access=/);assert.deepEqual(await verified.json(),{ok:true});
 }finally{globalThis.fetch=originalFetch;for(const [key,value]of Object.entries(previous)){if(value===undefined)delete process.env[key];else process.env[key]=value}}
});

test('backoffice APIs enforce session, origin, validation and invitation secrecy', async () => {
 const names=['SUPABASE_INTERNAL_URL','SUPABASE_ANON_KEY','BREVO_API_KEY','APP_ENV'];
 const previous=Object.fromEntries(names.map(name=>[name,process.env[name]]));
 const originalFetch=globalThis.fetch;
 let admin=true,delivery=true,databaseStatus=200;const calls=[];
 Object.assign(process.env,{SUPABASE_INTERNAL_URL:'https://supabase.fixture.invalid',SUPABASE_ANON_KEY:'fixture-anon',BREVO_API_KEY:'fixture-key',APP_ENV:'test'});
 globalThis.fetch=async(input,init)=>{
  const url=String(input);const body=init?.body?JSON.parse(init.body):null;
  if(url.endsWith('/auth/v1/user'))return Response.json({id:'26000000-0000-0000-0000-000000000001',email:'fixture@example.invalid',email_confirmed_at:'2026-10-19T00:00:00Z'});
  if(url.endsWith('/rest/v1/rpc/is_platform_admin'))return Response.json(admin);
  if(url.endsWith('/rest/v1/rpc/session_context_v1'))return Response.json(null);
  if(url.endsWith('/rest/v1/rpc/platform_read'))return Response.json(databaseStatus===200?{total:0,items:[]}:{message:'recent MFA required'},{status:databaseStatus});
  if(url.endsWith('/rest/v1/rpc/platform_manage')){if(databaseStatus!==200)return Response.json({message:'recent MFA required'},{status:databaseStatus});calls.push(body);return Response.json(body.operation==='invitation.create'?{id:'26000000-0000-0000-0000-000000000031',email:'invite@example.invalid',token:'a'.repeat(64),company_name:'Fixture'}:{ok:true});}
  if(url.endsWith('/rest/v1/rpc/platform_public_settings'))return Response.json({platform_name:'Fixture',support_email:'support@example.invalid',support_url:'https://example.invalid'});
  if(url==='https://api.brevo.com/v3/smtp/email')return new Response('{}',{status:delivery?201:503});
  throw new Error('Unexpected external request in fixture test');
 };
 try {
  const {default:worker}=await import('../dist/server/index.js');
  const request=(path,body,headers={})=>worker.fetch(new Request(`http://localhost${path}`,{method:body?'POST':'GET',headers:{host:'localhost',origin:'http://localhost',cookie:'jf_auth_access=fixture-token','content-type':'application/json',...headers},...(body?{body:JSON.stringify(body)}:{})}),{ASSETS:{fetch:()=>new Response('',{status:404})}},{waitUntil(){},passThroughOnException(){}});
  assert.equal((await request('/api/backoffice',null,{cookie:''})).status,403);
  admin=false;assert.equal((await request('/api/backoffice')).status,403);admin=true;
  assert.equal((await request('/api/backoffice?section=companies&page=-1')).status,400);
  assert.equal((await request('/api/backoffice?section=companies')).status,200);
  const mutation={operation:'invitation.create',company:'26000000-0000-0000-0000-000000000011',values:{email:'invite@example.invalid',role:'member'},reason:'Fixture invite request'};
  databaseStatus=403;const stepup=await request('/api/backoffice?section=companies');assert.equal(stepup.status,403);assert.equal((await stepup.json()).code,'ADMIN_MFA_REQUIRED');assert.equal((await request('/api/backoffice',mutation)).status,403);
  databaseStatus=429;assert.equal((await request('/api/backoffice',mutation)).status,429);databaseStatus=200;
  assert.equal((await request('/api/backoffice',mutation,{origin:'https://outside.invalid'})).status,403);
  assert.equal((await request('/api/backoffice',{...mutation,reason:''})).status,400);
  const sent=await request('/api/backoffice',mutation);assert.equal(sent.status,200);assert.deepEqual(await sent.json(),{ok:true});
  delivery=false;assert.equal((await request('/api/backoffice',mutation)).status,503);assert.equal(calls.at(-1).operation,'invitation.revoke');
  const settings=await request('/api/platform/settings',null,{cookie:''});assert.equal(settings.status,200);assert.equal(Object.keys(await settings.json()).length,3);
 } finally {globalThis.fetch=originalFetch;for(const name of names){if(previous[name]===undefined)delete process.env[name];else process.env[name]=previous[name];}}
});


test('logout works without MFA and deletion forwards only confirmed administrator inputs',async()=>{
 const original=globalThis.fetch;const previous={...process.env};let platform=true,deny=true;const calls=[];
 process.env.APP_ENV='test';process.env.SUPABASE_INTERNAL_URL='http://deletion-fixture.invalid';process.env.SUPABASE_ANON_KEY='fixture';
 globalThis.fetch=async(input,init)=>{const path=new URL(String(input)).pathname;
  if(path==='/auth/v1/user')return Response.json({id:'26000000-0000-0000-0000-000000000001',email:'fixture@example.invalid',email_confirmed_at:'2026-10-19T00:00:00Z'});
  if(path.endsWith('/rpc/is_platform_admin'))return Response.json(platform);
  if(path.endsWith('/rpc/session_context_v1'))return Response.json(null);
  if(path.endsWith('/rpc/revoke_current_session')){calls.push('revoke');return new Response(null,{status:204})}
  if(path==='/auth/v1/logout'){calls.push('logout');return new Response(null,{status:204})}
  if(path.endsWith('/rpc/company_deletion')){calls.push(JSON.parse(init.body));return deny?Response.json({message:'recent MFA required'},{status:403}):Response.json({id:'fixture-job',state:'queued'})}
  throw Error('Unexpected deletion fixture request');
 };
 try{
 const {default:worker}=await import('../dist/server/index.js');
 const send=(path,body,origin='http://localhost',cookie='jf_auth_access=fixture')=>worker.fetch(new Request('http://localhost'+path,{method:body?'POST':'GET',headers:{host:'localhost',origin,cookie,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),{ASSETS:{fetch:()=>new Response('',{status:404})}},{waitUntil(){},passThroughOnException(){}});
 assert.equal((await send('/api/auth/sign-out',{},'https://foreign.invalid')).status,403);
 const logout=await send('/api/auth/sign-out',{});assert.equal(logout.status,200);assert.match(logout.headers.get('set-cookie'),/jf_auth_access=;.*Max-Age=0/);assert.ok(calls.includes('revoke'));assert.ok(calls.includes('logout'));
 const body={company:'26000000-0000-0000-0000-000000000011',confirmation:'Fixture',reason:'Acceptance fixture',removeAccounts:true,operation:'force',mfa:true};
 assert.equal((await send('/api/backoffice/company-deletion',body,'https://foreign.invalid')).status,403);
 assert.equal((await send('/api/backoffice/company-deletion',body,undefined,'')).status,403);
 platform=false;assert.equal((await send('/api/backoffice/company-deletion',body)).status,403);platform=true;
 const factor=await send('/api/backoffice/company-deletion',body);assert.equal(factor.status,403);assert.equal((await factor.json()).code,'ADMIN_MFA_REQUIRED');
 deny=false;assert.equal((await send('/api/backoffice/company-deletion',{...body,confirmation:''})).status,202); // Exact-name check is authoritative in SQL.
 assert.deepEqual(calls.at(-1),{operation:'request',target_company:body.company,confirmation:'',change_reason:body.reason,remove_accounts:true});
 assert.equal((await send('/api/backoffice/company-deletion',{...body,removeAccounts:'yes'})).status,400);
 process.env.APP_ENV='live';assert.equal((await send('/api/backoffice/company-deletion',body)).status,503);
 }finally{globalThis.fetch=original;for(const key of ['APP_ENV','SUPABASE_INTERNAL_URL','SUPABASE_ANON_KEY']){if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key]}}
});
