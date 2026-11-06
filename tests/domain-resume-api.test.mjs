import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {validResume} from '../shared/resume-policy.mjs';
import {validCompanyHostname} from '../app/lib/company-domain.ts';
import {brandingDefaults} from '../app/components/personalization/branding-model.ts';
import {diagnoseCompanyDomain} from '../app/lib/company-domain-diagnostics.ts';
test('PDF envelope rejects executable, encrypted, oversized and fake content; hostnames reject URLs/IPs/internal names',async()=>{
 const pdf=await readFile('public/documents/curriculo-demonstrativo.pdf');assert.ok(validResume(pdf));
 for(const bytes of [Buffer.from('<html>bad</html>'),Buffer.alloc(5242881),Buffer.from('%PDF-1.4 /JavaScript /JS (alert(1)) %%EOF'),Buffer.from('%PDF-1.4 /Encrypt %%EOF')])assert.equal(validResume(bytes),false);
 for(const host of ['https://careers.example.com','127.0.0.1','jobforged.com','bad.jobforged.com','a.local','evil.com/path','a..com','-bad.com'])assert.equal(validCompanyHostname(host),false);
 assert.ok(validCompanyHostname('carreiras.empresa.com.br'));
});
test('custom-domain DNS check confirms proof and route without trusting client input',async()=>{
 const original=globalThis.fetch;const proof='jobforged-verification='+('a'.repeat(64));
 globalThis.fetch=async input=>{const url=new URL(String(input)),name=url.searchParams.get('name'),type=url.searchParams.get('type');
  if(type==='TXT')return Response.json({Answer:name==='_jobforged.careers.fixture.invalid'||name==='_jobforged.fixture.invalid'?[{type:16,data:'"'+proof+'"'}]:[]});
  if(type==='A')return Response.json({Answer:name==='fixture.invalid'?[{type:1,data:'187.77.229.27'}]:[{type:5,data:'test.jobforged.com.'},{type:1,data:'187.77.229.27'}]});
  if(type==='CNAME')return Response.json({Answer:name==='careers.fixture.invalid'?[{type:5,data:'test.jobforged.com.'}]:[]});
  return Response.json({Answer:[]});
 };
 try{
  const result=await diagnoseCompanyDomain('careers.fixture.invalid',proof);assert.equal(result.ownershipVerified,true);assert.equal(result.addressVerified,true);assert.equal(result.ready,true);assert.deepEqual(result.cnames,['test.jobforged.com']);assert.equal(JSON.stringify(result).includes(proof),false);
  const root=await diagnoseCompanyDomain('fixture.invalid',proof);assert.equal(root.ready,true);assert.deepEqual(root.cnames,[]);
  const mismatch=await diagnoseCompanyDomain('wrong.fixture.invalid','different-proof');assert.equal(mismatch.ownershipVerified,false);assert.equal(mismatch.addressVerified,true);assert.equal(mismatch.ready,false);
 }finally{globalThis.fetch=original}
});
test('candidate resume BFF requires candidate identity, origin/version and serves only private attachments',async()=>{
 const original=globalThis.fetch,previous={url:process.env.SUPABASE_INTERNAL_URL,key:process.env.SUPABASE_ANON_KEY};process.env.SUPABASE_INTERNAL_URL='https://resume.fixture.invalid';process.env.SUPABASE_ANON_KEY='fixture-anon';
 const pdf=await readFile('public/documents/curriculo-demonstrativo.pdf');let stale=false;
 globalThis.fetch=async(url,init)=>{const path=new URL(String(url)).pathname,body=typeof init?.body==='string'?JSON.parse(init.body):null;
 if(path==='/auth/v1/user')return Response.json({id:'35000000-0000-4000-8000-000000000001',email:'candidate@example.invalid',email_confirmed_at:'2026-10-29T00:00:00Z'});
 if(path.endsWith('/rpc/is_platform_admin'))return Response.json(false);
 if(path.endsWith('/rpc/session_context_v1'))return Response.json(null);
 if(path.endsWith('/rpc/candidate_context'))return Response.json({fullName:'Candidate fixture',version:0,slug:'fixture-company'});
 if(path.endsWith('/rpc/candidate_resume'))return stale&&body?.operation==='commit'?Response.json({code:'PT409'},{status:409}):Response.json({id:'35000000-0000-4000-8000-000000000011',path:'fixture/file.pdf',name:'fixture.pdf',size:pdf.length,sha256:createHash('sha256').update(pdf).digest('hex'),version:1});
 if(path.startsWith('/storage/v1/object/candidate-resumes/'))return new Response(init?.method==='POST'?'{}':pdf,{headers:{'Content-Type':init?.method==='POST'?'application/json':'application/pdf'}});
 if(path.endsWith('/rpc/resolve_company_domain'))return Response.json(body.requested_hostname==='careers.fixture.invalid'?'fixture-company':null);
 if(path.endsWith('/rpc/read_public_company_portal'))return Response.json({version:1,configuration:brandingDefaults('fixture','Public Fixture')});
 throw new Error('Unexpected resume fixture operation: '+path);};
 try{const {default:worker}=await import('../dist/server/index.js');const request=(path,body,origin='http://localhost',cookie='jf_auth_access=fixture',base='http://localhost')=>worker.fetch(new Request(base+path,{method:body?'POST':'GET',headers:{host:new URL(base).host,origin,cookie,'Content-Type':'application/pdf','x-profile-version':'0','x-file-name':'curriculo.pdf'},...(body?{body}:{})}),{ASSETS:{fetch:()=>new Response('',{status:404})}},{waitUntil(){},passThroughOnException(){}});
 assert.equal((await request('/api/portal/resume',null,undefined,'')).status,403);
 assert.equal((await request('/api/portal/resume',pdf,'https://foreign.invalid')).status,403);
 assert.equal((await request('/api/portal/resume',Buffer.from('not a PDF'))).status,400);
 assert.equal((await request('/api/portal/resume',pdf)).status,200);
 stale=true;assert.equal((await request('/api/portal/resume',pdf)).status,409);stale=false;
 const download=await request('/api/portal/resume');assert.equal(download.status,200);assert.match(download.headers.get('Content-Disposition'),/attachment/);assert.match(download.headers.get('Cache-Control'),/private, no-store/);assert.deepEqual(Buffer.from(await download.arrayBuffer()),pdf);
 const throughGateway=path=>worker.fetch(new Request('http://jbfd-test-app-1:3000'+path,{headers:{host:'jbfd-test-app-1:3000','x-forwarded-host':'careers.fixture.invalid','x-forwarded-proto':'https',cookie:'jf_auth_access=fixture'}}),{ASSETS:{fetch:()=>new Response('',{status:404})}},{waitUntil(){},passThroughOnException(){}});
 assert.equal((await throughGateway('/api/portal/resume')).status,200);
 assert.equal((await throughGateway('/api/auth/session')).status,200);
 assert.equal((await throughGateway('/backoffice')).status,404);assert.equal((await throughGateway('/api/company/branding')).status,404);
 const authRequest=(host,origin,body,path='/api/auth/sign-in')=>worker.fetch(new Request('http://jbfd-test-app-1:3000'+path,{method:'POST',headers:{host:'jbfd-test-app-1:3000','x-forwarded-host':host,'x-forwarded-proto':'https',origin,'Content-Type':'application/json'},body:JSON.stringify(body)}),{ASSETS:{fetch:()=>new Response('',{status:404})}},{waitUntil(){},passThroughOnException(){}});
 assert.equal((await authRequest('careers.fixture.invalid','https://careers.fixture.invalid',{email:'invalid',password:'x'})).status,400);assert.equal((await authRequest('careers.fixture.invalid','https://foreign.invalid',{email:'invalid',password:'x'})).status,403);assert.equal((await authRequest('unknown.fixture.invalid','https://unknown.fixture.invalid',{email:'invalid',password:'x'})).status,404);
 assert.equal((await authRequest('careers.fixture.invalid','https://careers.fixture.invalid',{email:'candidate@example.invalid',password:'FixturePassword8!',confirmPassword:'FixturePassword8!',fullName:'Candidate Fixture',acceptedTerms:true,slug:'another-company'},'/api/auth/candidate-sign-up')).status,403);
 assert.equal((await throughGateway('/recuperar-senha')).status,303);
 assert.equal((await request('/backoffice',null,undefined,'','https://careers.fixture.invalid')).status,404);
 assert.equal((await request('/',null,undefined,'','https://unknown.fixture.invalid')).status,404);
 const page=await request('/',null,undefined,'','https://careers.fixture.invalid');assert.equal(page.status,200);const html=await page.text();assert.match(html,/Public Fixture/);assert.doesNotMatch(html,/Entrar na JobForged/);assert.match(html,/jf-widget-dialog--modal/);
 }finally{globalThis.fetch=original;for(const [name,value] of [['SUPABASE_INTERNAL_URL',previous.url],['SUPABASE_ANON_KEY',previous.key]]){if(value===undefined)delete process.env[name];else process.env[name]=value}}
});
