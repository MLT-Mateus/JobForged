import test from 'node:test';
import assert from 'node:assert/strict';
import {renderInterviewEmail} from '../app/lib/interview-email.ts';

test('interview invitation escapes client content and retains brand and demo meeting disclosure',()=>{
 const html=renderInterviewEmail({company:'Company <script>',name:'A & B',title:'Interview',startsAt:'2026-11-16T13:00:00Z',endsAt:'2026-11-16T14:00:00Z',url:'https://meet.google.com/',logo:'https://example.invalid/logo.png',color:'#123456'});
 assert.ok(html.includes('Company &lt;script&gt;'));assert.ok(html.includes('A &amp; B'));assert.ok(html.includes('Enviado por'));assert.ok(html.includes('convite de demonstração'));assert.ok(html.includes('10:00'));assert.ok(html.includes('/brand/jobforged-logo.png'));assert.ok(html.includes('#087a76'));assert.ok(!html.includes('#123456'));assert.ok(!html.includes('<script>'));
});
test('operational BFF rejects wrong origins and tenant switches, preserves versions and custom-host candidate access',async()=>{
 const saved={APP_ENV:process.env.APP_ENV,SUPABASE_INTERNAL_URL:process.env.SUPABASE_INTERNAL_URL,SUPABASE_ANON_KEY:process.env.SUPABASE_ANON_KEY},original=globalThis.fetch;
 process.env.APP_ENV='test';process.env.SUPABASE_INTERNAL_URL='https://operations.fixture.invalid';process.env.SUPABASE_ANON_KEY='public-fixture-key';
 const cid='58000000-0000-4000-8000-000000000011',id='58000000-0000-4000-8000-000000000031';let candidate=false,code=null;const calls=[];
 globalThis.fetch=async(url,init)=>{const address=String(url),body=init?.body?JSON.parse(init.body):null;
  if(address.endsWith('/auth/v1/user'))return Response.json({id:'58000000-0000-4000-8000-000000000001',email:'fixture@example.invalid',email_confirmed_at:'2026-10-29T00:00:00Z'});
  if(address.endsWith('/rpc/resolve_company_domain'))return Response.json('fixture-company');
  if(address.endsWith('/rpc/is_platform_admin'))return Response.json(false);
  if(address.endsWith('/rpc/session_context_v1'))return Response.json(candidate?null:{company_id:cid,role:'owner',companies:{id:cid,name:'Fixture'}});
  if(address.endsWith('/rpc/candidate_context'))return Response.json(candidate?{fullName:'Candidate Fixture',version:0,slug:'fixture-company'}:null);
  if(address.endsWith('/rpc/company_operations_v1')){calls.push(body);return code?Response.json({code},{status:400}):Response.json({companyId:cid,applications:[]})}
  if(address.endsWith('/rpc/candidate_applications_v1')){calls.push(body);return Response.json([])}
  throw Error('Unexpected isolated request '+address);
 };
 try{const {default:worker}=await import('../dist/server/index.js');
 const request=(path,body,cookie='jf_auth_access=fixture',host='localhost',origin='http://'+host)=>worker.fetch(new Request('http://'+host+path,{method:body?'POST':'GET',headers:{host,origin,cookie,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),{ASSETS:{fetch:()=>new Response('',{status:404})}},{waitUntil(){},passThroughOnException(){}});
 assert.equal((await request('/api/company/operations',null,'')).status,403);
 const move={companyId:cid,id,operation:'move',version:4,document:{stage:'Triagem'}};
 assert.equal((await request('/api/company/operations',move,undefined,'localhost','https://other.invalid')).status,403);
 assert.equal((await request('/api/company/operations',{...move,companyId:'foreign'})).status,409);assert.equal(calls.length,0);
 assert.equal((await request('/api/company/operations',move)).status,200);assert.equal(calls.at(-1).expected_version,4);
 code='42501';assert.equal((await request('/api/company/operations',move)).status,403);code='40001';assert.equal((await request('/api/company/operations',move)).status,409);code=null;
 candidate=true;assert.equal((await request('/api/company/operations')).status,403);
 assert.equal((await request('/api/portal/applications',null,undefined,'careers.fixture.invalid')).status,200);
 assert.equal((await request('/api/portal/applications',{operation:'apply',jobId:id,accepted:true},undefined,'careers.fixture.invalid')).status,200);assert.equal(calls.at(-1).accepted,true);
 }finally{globalThis.fetch=original;for(const [k,v] of Object.entries(saved)){if(v===undefined)delete process.env[k];else process.env[k]=v}}
});
