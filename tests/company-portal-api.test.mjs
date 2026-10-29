import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {brandContent,brandingDefaults} from '../app/components/personalization/branding-model.ts';
test('portal BFF protects tenant operations and exposes only public image bytes',async()=>{
 const before=Object.fromEntries(['SUPABASE_INTERNAL_URL','SUPABASE_ANON_KEY'].map(key=>[key,process.env[key]])),original=globalThis.fetch;
 process.env.SUPABASE_INTERNAL_URL='https://portal.fixture.invalid';process.env.SUPABASE_ANON_KEY='public-fixture-key';
 const cid='31000000-0000-4000-8000-000000000011',asset='31000000-0000-4000-8000-000000000041',bytes=Buffer.from([137,80,78,71,13,10,26,10,0]);let role='owner',code=null,publicImage=true,tampered=false,published=false;const writes=[];
 globalThis.fetch=async(url,init)=>{const address=String(url),body=typeof init?.body==='string'?JSON.parse(init.body):null;
  if(address.endsWith('/auth/v1/user'))return Response.json({id:'31000000-0000-4000-8000-000000000001',email:'fixture@example.invalid',email_confirmed_at:'2026-10-29T00:00:00Z'});
  if(address.endsWith('/rpc/is_platform_admin'))return Response.json(false);
  if(address.endsWith('/rpc/session_context_v1'))return Response.json({id:'member',company_id:cid,role,full_name:'Fixture',companies:{id:cid,name:'Fixture'}});
  if(address.endsWith('/rpc/read_company_portal'))return Response.json({companyId:cid,slug:'fixture-company',version:1,isPublic:false,brandingVersion:0});
  if(address.endsWith('/rpc/write_company_portal')){writes.push(body);return code?Response.json({code},{status:400}):Response.json({companyId:cid,slug:'fixture-company',version:2,isPublic:true,brandingVersion:1})}
  if(address.endsWith('/rpc/read_public_company_portal')){assert.equal(init.headers.Authorization,'Bearer public-fixture-key');return Response.json(published&&body.requested_slug==='fixture-company'?{version:3,configuration:brandContent(brandingDefaults(cid,'Public Fixture'))}:null)}
  if(address.endsWith('/rpc/read_public_portal_asset'))return Response.json(publicImage?{path:`${cid}/${asset}.png`,size:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}:null);
  if(address.includes('/storage/v1/object/')){assert.equal(init.headers.Authorization,'Bearer public-fixture-key');return new Response(tampered?Buffer.from('bad'):bytes)}
  throw new Error('Unexpected isolated request');
 };
 try{const {default:worker}=await import('../dist/server/index.js');
  const request=(path,body,cookie='jf_auth_access=fixture',origin='http://localhost')=>worker.fetch(new Request('http://localhost'+path,{method:body?'POST':'GET',headers:{host:'localhost',origin,cookie,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),{ASSETS:{fetch:()=>new Response('',{status:404})}},{});
  assert.equal((await request('/fixture-company',null,'')).status,404);published=true;const page=await request('/fixture-company',null,'');assert.equal(page.status,200);const html=await page.text();assert.match(html,/Public Fixture/);assert.doesNotMatch(html,/Vagas de exemplo|Product Designer|fixture@example.invalid/);
  assert.equal((await request('/api/company/portal',null,'')).status,403);
  assert.equal((await request('/api/company/portal')).status,200);
  const mutation={operation:'publish',companyId:cid,version:1,brandingVersion:0,configuration:brandContent(brandingDefaults(cid,'Fixture'))};
  role='member';assert.equal((await request('/api/company/portal',mutation)).status,403);role='owner';
  assert.equal((await request('/api/company/portal',mutation,'jf_auth_access=fixture','https://elsewhere.invalid')).status,403);
  assert.equal((await request('/api/company/portal',{...mutation,companyId:'other'})).status,409);
  assert.equal((await request('/api/company/portal',{...mutation,operation:'address',slug:'api'})).status,400);
  assert.equal((await request('/api/company/portal',mutation)).status,200);assert.equal(writes.at(-1).operation,'publish');
  for(const error of ['23505','40001']){code=error;assert.equal((await request('/api/company/portal',mutation)).status,409)}code=null;
  const image=await request(`/api/portals/fixture-company/assets/${asset}`,null,'');assert.equal(image.status,200);assert.equal(image.headers.get('Content-Type'),'image/png');assert.deepEqual(Buffer.from(await image.arrayBuffer()),bytes);
  tampered=true;assert.equal((await request(`/api/portals/fixture-company/assets/${asset}`,null,'')).status,503);tampered=false;publicImage=false;assert.equal((await request(`/api/portals/fixture-company/assets/${asset}`,null,'')).status,404);
 }finally{globalThis.fetch=original;for(const [key,value] of Object.entries(before)){if(value===undefined)delete process.env[key];else process.env[key]=value}}
});
