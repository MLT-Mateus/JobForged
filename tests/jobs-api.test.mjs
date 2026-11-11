import assert from 'node:assert/strict';
import test from 'node:test';
test('job BFF enforces session, origin, organization and preserves RPC concurrency',async()=>{
 const previous={SUPABASE_INTERNAL_URL:process.env.SUPABASE_INTERNAL_URL,SUPABASE_ANON_KEY:process.env.SUPABASE_ANON_KEY},original=globalThis.fetch;
 process.env.SUPABASE_INTERNAL_URL='https://jobs.fixture.invalid';process.env.SUPABASE_ANON_KEY='public-fixture-key';
 const cid='31000000-0000-4000-8000-000000000011',id='31000000-0000-4000-8000-000000000041';let role='owner',code=null;const calls=[];
 globalThis.fetch=async(url,init)=>{const address=String(url),body=init?.body?JSON.parse(init.body):null;
  if(address.endsWith('/auth/v1/user'))return Response.json({id:'31000000-0000-4000-8000-000000000001',email:'fixture@example.invalid',email_confirmed_at:'2026-10-29T00:00:00Z'});
  if(address.endsWith('/rpc/resolve_company_domain'))return Response.json('fixture-company');
  if(address.endsWith('/rpc/is_platform_admin'))return Response.json(false);
  if(address.endsWith('/rpc/session_context_v1'))return Response.json({company_id:cid,role,companies:{id:cid,name:'Fixture'}});
  if(address.endsWith('/rpc/company_jobs_v1')){calls.push(body);return code?Response.json({code},{status:400}):Response.json(body.operation==='list'?[]:{id,version:2})}
  if(address.endsWith('/rpc/public_jobs_v1')){assert.equal(init.headers.Authorization,'Bearer public-fixture-key');assert.deepEqual(body,{requested_slug:'fixture-company'});return Response.json([{id,title:'Published fixture'}])}
  throw Error('Unexpected isolated request');
 };
 try{const {default:worker}=await import('../dist/server/index.js');
 const request=(path,body,cookie='jf_auth_access=fixture',origin='http://localhost',host='localhost')=>worker.fetch(new Request('http://'+host+path,{method:body?'POST':'GET',headers:{host,origin,cookie,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),{ASSETS:{fetch:()=>new Response('',{status:404})}},{waitUntil(){},passThroughOnException(){}});
 assert.equal((await request('/api/company/jobs',null,'')).status,403);
 const mutation={operation:'save',companyId:cid,id,version:1,status:'Publicada',document:{title:'Fixture'}};
 assert.equal((await request('/api/company/jobs',mutation,undefined,'https://other.invalid')).status,403);
 assert.equal((await request('/api/company/jobs',{...mutation,companyId:'other'})).status,409);
 role='member';assert.equal((await request('/api/company/jobs',mutation)).status,403);role='owner';assert.equal(calls.length,0);
 const saved=await request('/api/company/jobs',mutation);assert.equal(saved.status,200);assert.equal(saved.headers.get('Cache-Control'),'private, no-store');assert.deepEqual(calls.at(-1),{operation:'save',job_id:id,document:{title:'Fixture'},requested_status:'Publicada',expected_version:1});
 for(const [c,status] of [['40001',409],['42501',403],['PT422',422],['P0002',404],['PT429',429]]){code=c;assert.equal((await request('/api/company/jobs',mutation)).status,status)}code=null;
 assert.equal((await request('/api/company/jobs',{...mutation,document:{title:'x'.repeat(71000)}})).status,413);
 assert.equal((await request('/api/company/jobs?id=invalid')).status,400);
 const pub=await request('/api/portals/fixture-company/jobs',null,'');assert.equal(pub.status,200);assert.equal(pub.headers.get('Cache-Control'),'no-store');assert.equal((await pub.json())[0].title,'Published fixture');
 assert.equal((await request('/api/portals/fixture-company/jobs',null,'',undefined,'careers.fixture.invalid')).status,200);
 assert.equal((await request('/api/portals/other-company/jobs',null,'',undefined,'careers.fixture.invalid')).status,404);
 assert.equal((await request('/api/company/jobs',null,'',undefined,'careers.fixture.invalid')).status,404);
 }finally{globalThis.fetch=original;for(const [k,v] of Object.entries(previous)){if(v===undefined)delete process.env[k];else process.env[k]=v}}
});
