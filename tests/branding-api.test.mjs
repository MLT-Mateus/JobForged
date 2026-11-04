import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import test from 'node:test';
import {brandingDefaults,brandContent} from '../app/components/personalization/branding-model.ts';
test('branding API authorizes roles, handles conflicts and processes private image uploads',async()=>{
 const names=['SUPABASE_INTERNAL_URL','SUPABASE_ANON_KEY','SUPABASE_BRANDING_STORAGE_TOKEN'];const prior=Object.fromEntries(names.map(n=>[n,process.env[n]]));const original=globalThis.fetch;
 Object.assign(process.env,{SUPABASE_INTERNAL_URL:'https://branding.fixture.invalid',SUPABASE_ANON_KEY:'fixture-anon',SUPABASE_BRANDING_STORAGE_TOKEN:'bucket-only-fixture-token'});
 const cid='38000000-0000-0000-0000-000000000011';let role='owner',platform=false,conflict=false,stored=null,asset=null,tampered=false,releaseCount=0,quotaError=null;const writes=[];
 globalThis.fetch=async(url,init)=>{
  const address=String(url),body=typeof init?.body==='string'?JSON.parse(init.body):null;
  if(address.endsWith('/auth/v1/user'))return Response.json({id:'38000000-0000-0000-0000-000000000001',email:'owner@example.invalid',email_confirmed_at:'2026-10-19T00:00:00Z'});
  if(address.endsWith('/rpc/is_platform_admin'))return Response.json(platform);
  if(address.endsWith('/rpc/session_context_v1'))return Response.json({id:'member',company_id:cid,role,full_name:'Fixture Owner',companies:{id:cid,name:'Fixture Branding'}});
  if(address.endsWith('/rpc/reserve_company_image'))return quotaError?Response.json(quotaError,{status:400}):Response.json({assetId:body.asset_id,expiresIn:300,maxBytes:5242880});
  if(address.endsWith('/rpc/release_company_image')){releaseCount++;return Response.json(null)}
  if(address.endsWith('/rpc/read_company_branding'))return Response.json({companyId:cid,companyName:'Fixture Branding',editable:role!=='member',version:0,draft:role==='member'?null:{},published:{},publishedVersion:0,history:[]});
  if(address.endsWith('/rpc/write_company_branding')){writes.push(body);return body.operation==='save'?Response.json({code:'PT409',details:'editor_contract_retired'},{status:409}):conflict?Response.json({code:'40001'},{status:409}):Response.json(1)}
  if(address.includes('/storage/v1/object/company-branding/')){assert.equal(init.headers.Authorization,'Bearer fixture');if(init.method==='POST'){assert.equal(init.headers['x-upsert'],'false');stored=Buffer.from(init.body);return Response.json({ok:true})}return new Response(tampered?Buffer.from('tampered'):stored)}
  if(address.endsWith('/rpc/register_company_brand_asset')){asset={id:body.asset_id,path:`${cid}/${body.asset_id}.png`,sha256:body.file_sha256,size:body.file_size};assert.equal(body.file_sha256,createHash('sha256').update(stored).digest('hex'));return Response.json(asset)}
  if(address.endsWith('/rpc/read_company_brand_asset'))return Response.json(body.asset_id===asset?.id?asset:null);
  throw new Error('Unexpected request in isolated fixture');
 };
 try{
  const {default:worker}=await import('../dist/server/index.js');
  const request=(path,body,headers={})=>worker.fetch(new Request(`http://localhost${path}`,{method:body?'POST':'GET',headers:{host:'localhost',origin:'http://localhost',cookie:'jf_auth_access=fixture',...(body&&!(body instanceof FormData)?{'content-type':'application/json'}:{}),...headers},...(body?{body:body instanceof FormData?body:JSON.stringify(body)}:{})}),{ASSETS:{fetch:()=>new Response('',{status:404})}},{waitUntil(){},passThroughOnException(){}});
  assert.equal((await request('/api/company/branding',null,{cookie:''})).status,403);
  platform=true;assert.equal((await request('/api/company/branding')).status,403);platform=false;
  assert.equal((await request('/api/company/branding')).status,200);
  const mutation={operation:'publish',companyId:cid,version:0,configuration:brandContent(brandingDefaults(cid,'Fixture Branding'))};
  role='member';assert.equal((await request('/api/company/branding',mutation)).status,403);role='owner';
  assert.equal((await request('/api/company/branding',mutation,{origin:'https://outside.invalid'})).status,403);
  assert.equal((await request('/api/company/branding',{...mutation,companyId:'38000000-0000-0000-0000-000000000012'})).status,409);
  assert.equal((await request('/api/company/branding',mutation)).status,200);assert.equal(writes.at(-1).expected_version,0);
  assert.equal((await request('/api/company/branding',{...mutation,operation:'save'})).status,409);
  conflict=true;const stale=await request('/api/company/branding',mutation);assert.equal(stale.status,409);assert.equal((await stale.json()).conflict,true);conflict=false;
  const beforeReset=writes.length;assert.equal((await request('/api/company/branding',{...mutation,operation:'reset'})).status,200);assert.equal(writes.length,beforeReset,'Reset on defaults must not write another revision');
  const image=await sharp({create:{width:8,height:8,channels:3,background:'#20B2AA'}}).png().toBuffer();
  const form=new FormData();form.set('file',new File([image],'logo.png',{type:'image/png'}));form.set('kind','logoMain');form.set('companyId',cid);
  const upload=await request('/api/company/branding/assets',form);assert.equal(upload.status,200);const result=await upload.json();assert.match(result.asset.url,/^\/api\/company\/branding\/assets\//);assert.equal(JSON.stringify(result).includes('bucket-only-fixture-token'),false);
  const read=await request(result.asset.url);assert.equal(read.status,200);assert.equal(read.headers.get('content-type'),'image/png');assert.equal(read.headers.get('x-content-type-options'),'nosniff');
  assert.equal((await request('/api/company/branding/assets/38000000-0000-0000-0000-000000000099')).status,404);
  tampered=true;assert.equal((await request(result.asset.url)).status,503);
  tampered=false;
  const binary=async(bytes,name,mime,company=cid)=>worker.fetch(new Request('http://localhost/api/company/branding/assets',{method:'POST',headers:{host:'localhost',origin:'http://localhost',cookie:'jf_auth_access=fixture','content-type':mime,'x-upload-name':encodeURIComponent(name),'x-company-id':company,'x-image-kind':'heroImage'},body:bytes}),{ASSETS:{fetch:()=>new Response('',{status:404})}},{waitUntil(){},passThroughOnException(){}});
  assert.equal((await binary(image,'drop.png','image/png')).status,200);
  const simpleSvg=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 8"><rect width="16" height="8" fill="#20B2AA"/></svg>');
  assert.equal((await binary(simpleSvg,'drop.svg','image/svg+xml')).status,200);assert.equal((await sharp(stored).metadata()).format,'png');
  const avif=await sharp(image).avif().toBuffer();assert.equal((await binary(avif,'drop.avif','image/avif')).status,200);
  assert.equal((await binary(image,'drop.png','image/png','other-company')).status,409);
  role='member';assert.equal((await binary(image,'drop.png','image/png')).status,403);role='owner';
  const beforeUnsafe=Buffer.from(stored);assert.equal((await binary(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><script/></svg>'),'bad.svg','image/svg+xml')).status,400);assert.deepEqual(stored,beforeUnsafe);
  assert.equal(releaseCount,1,'Rejected SVG must release its reservation');
  quotaError={code:'53300',message:'upload rate exceeded'};const rate=await binary(image,'a.png','image/png');assert.equal(rate.status,429);assert.equal(rate.headers.get('retry-after'),'60');assert.match((await rate.json()).message,/1 minuto/);
  quotaError={code:'53300',message:'too many concurrent uploads'};assert.match((await (await binary(image,'a.png','image/png')).json()).message,/dois envios/);
  quotaError={code:'54000',message:'company image quota exceeded'};assert.match((await (await binary(image,'a.png','image/png')).json()).message,/200 imagens ou 1 GB/);quotaError=null;
  const svg=new FormData();svg.set('companyId',cid);svg.set('file',new File(['<svg/>'],'fake.png',{type:'image/png'}));assert.equal((await request('/api/company/branding/assets',svg)).status,400);
 }finally{globalThis.fetch=original;for(const name of names){if(prior[name]===undefined)delete process.env[name];else process.env[name]=prior[name]}}
});
