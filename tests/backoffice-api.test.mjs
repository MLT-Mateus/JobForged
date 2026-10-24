import assert from 'node:assert/strict';
import test from 'node:test';

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
  const request=(path,body,headers={})=>worker.fetch(new Request(`http://localhost${path}`,{method:body?'POST':'GET',headers:{host:'localhost',origin:'http://localhost',cookie:'jf_auth_access=fixture-token','content-type':'application/json',...headers},...(body?{body:JSON.stringify(body)}:{})}),{ASSETS:{fetch:()=>new Response('',{status:404})}},{});
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
