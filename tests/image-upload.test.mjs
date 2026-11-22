import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {normalizeBrandingImage,squareBrandingIcon} from '../app/lib/branding-image.ts';
import {imageAccept,imageMime,fileMatchesAccept,imageUploadOptions} from '../shared/image-upload.ts';
import {apiResponse} from '../app/lib/api-response.ts';
import {normalizeMemberPhoto} from '../app/lib/member-photo.ts';
test('profile photo API scopes writes to session and protects image reads',async()=>{
 const names=['SUPABASE_INTERNAL_URL','SUPABASE_ANON_KEY','APP_ENV'],previous=Object.fromEntries(names.map(k=>[k,process.env[k]])),original=globalThis.fetch;let written;
 Object.assign(process.env,{SUPABASE_INTERNAL_URL:'https://supabase.fixture.invalid',SUPABASE_ANON_KEY:'fixture-anon',APP_ENV:'test'});
 globalThis.fetch=async(input,init)=>{const url=String(input),body=init?.body?JSON.parse(init.body):null;
  if(url.endsWith('/auth/v1/user'))return Response.json({id:'fixture-owner',email:'owner@example.invalid',email_confirmed_at:'2026-11-10T00:00:00Z'});
  if(url.endsWith('/rpc/is_platform_admin'))return Response.json(false);
  if(url.endsWith('/rpc/session_context_v1'))return Response.json({company_id:'fixture-company',role:'member',full_name:'Fixture',companies:{id:'fixture-company',name:'Fixture'}});
  if(url.endsWith('/rpc/member_photo_write_v1')){written=body;return Response.json({memberId:'17000000-0000-4000-8000-000000000001',photoVersion:body.photo?1:0})}
  if(url.endsWith('/rpc/member_photo_read_v1'))return Response.json(written?.thumbnail??null);
  throw Error('Unexpected photo fixture request');
 };
 try{const {default:worker}=await import('../dist/server/index.js');
  const request=(method,body,origin='http://localhost',cookie='jf_auth_access=fixture-token',query='')=>worker.fetch(new Request('http://localhost/api/account/photo'+query,{method,headers:{host:'localhost',origin,cookie,'content-type':'image/png','x-upload-name':'photo.png'},...(body?{body}:{})}),{ASSETS:{fetch:()=>new Response('',{status:404})}},{waitUntil(){},passThroughOnException(){}});
  const png=await sharp({create:{width:30,height:20,channels:3,background:'#176c9a'}}).png().toBuffer();
  assert.equal((await request('POST',png,'https://foreign.invalid')).status,403);
  assert.equal((await request('POST',png,undefined,'')).status,403);
  assert.equal((await request('POST',Buffer.from('invalid'))).status,400);
  assert.equal((await request('POST',png)).status,200);assert.deepEqual(Object.keys(written).sort(),['photo','thumbnail']);
  const read=await request('GET',null,undefined,undefined,'?member=17000000-0000-4000-8000-000000000001');assert.equal(read.status,200);assert.equal(read.headers.get('content-type'),'image/webp');assert.match(read.headers.get('cache-control'),/private, no-store/);
  assert.equal((await request('DELETE')).status,200);assert.deepEqual(written,{photo:null,thumbnail:null});
 }finally{globalThis.fetch=original;for(const [key,value]of Object.entries(previous)){if(value===undefined)delete process.env[key];else process.env[key]=value}}
});
test('member photos produce bounded private WebP renditions without metadata',async()=>{
 for(const format of ['png','jpeg','webp','avif']){
  const input=await sharp({create:{width:500,height:300,channels:3,background:'#176c9a'}}).withMetadata().toFormat(format).toBuffer();
  const output=await normalizeMemberPhoto(input,`image/${format}`);
  for(const [key,size,limit] of [['photo',256,65536],['thumbnail',64,16384]]){
   const bytes=Buffer.from(output[key],'base64'),metadata=await sharp(bytes).metadata();
   assert.equal(metadata.format,'webp');assert.equal(metadata.width,size);assert.equal(metadata.height,size);assert.ok(bytes.length<=limit);assert.equal(metadata.exif,undefined);
  }
 }
 await assert.rejects(normalizeMemberPhoto(Buffer.from('<svg/>'),'image/svg+xml'));
 await assert.rejects(normalizeMemberPhoto(Buffer.alloc(2097153),'image/png'));
 await assert.rejects(normalizeMemberPhoto(Buffer.from('fake PNG'),'image/png'));
});
const svg=body=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 12">${body}</svg>`);
test('five supported image formats normalize to static PNG',async()=>{
 for(const [format,mime] of [['png','image/png'],['jpeg','image/jpeg'],['webp','image/webp'],['avif','image/avif']]){
  const input=await sharp({create:{width:24,height:12,channels:3,background:'#176c9a'}}).toFormat(format).toBuffer();
  const output=await normalizeBrandingImage(input,mime),meta=await sharp(output).metadata();
  assert.equal(meta.format,'png');assert.equal(meta.width,24);assert.equal(meta.height,12);
 }
 const output=await normalizeBrandingImage(svg('<rect width="24" height="12" style="fill:#16b3ad;opacity:0.8"/>'),'image/svg+xml');
 assert.equal((await sharp(output).metadata()).format,'png');
});
test('SVG code, resources, entities, excessive nesting and malformed XML are rejected',async()=>{
 for(const body of ['<script>alert(1)</script>','<rect onload="alert(1)"/>','<image href="https://example.org/a.png"/>','<foreignObject/>','<rect fill="url(https://example.org/a)"/>','<style>rect{fill:red}</style>','<rect style="fill:var(--remote)" onclick="x"/>','<g>'.repeat(34)+'</g>'.repeat(34),'<rect>']){
  await assert.rejects(normalizeBrandingImage(svg(body),'image/svg+xml'));
 }
 await assert.rejects(normalizeBrandingImage(Buffer.from('<!DOCTYPE svg [<!ENTITY a SYSTEM "file:///etc/passwd">]>'+svg('<text>&a;</text>').toString()),'image/svg+xml'));
 await assert.rejects(normalizeBrandingImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="99999" height="10"/>'),'image/svg+xml'));
});
test('server rejects MIME spoofing, corrupt, unsupported and oversized files',async()=>{
 const png=await sharp({create:{width:4,height:4,channels:3,background:'red'}}).png().toBuffer();
 await assert.rejects(normalizeBrandingImage(png,'image/jpeg'));
 await assert.rejects(normalizeBrandingImage(Buffer.from('Forbidden'),'image/png'));
 await assert.rejects(normalizeBrandingImage(Buffer.from('ncif'),'image/hvif'));
 await assert.rejects(normalizeBrandingImage(png,'image/png',{bytes:2,pixels:100}));
 const animation=await sharp({create:{width:4,height:8,pageHeight:4,channels:3,background:'red'}}).gif().toBuffer();
 await assert.rejects(normalizeBrandingImage(animation,'image/gif'));
});
test('selection, drop accept rules and binary transport share the supported formats',()=>{
 for(const [name,type] of [['logo.PNG','image/png'],['logo.jpg','image/jpeg'],['logo.webp','image/webp'],['logo.avif','image/avif'],['logo.svg','image/svg+xml']]){
  assert.equal(imageMime(name,type),type);assert.equal(fileMatchesAccept({name,type},imageAccept),true);
  const file=new File(['fixture'],name,{type}),options=imageUploadOptions(file,{'X-Image-Kind':'heroImage'});
  assert.equal(options.body,file);assert.equal(options.headers['Content-Type'],type);assert.equal(options.headers['X-Image-Kind'],'heroImage');
  assert.equal(options.credentials,'same-origin');assert.equal(options.headers['X-Upload-Name'],encodeURIComponent(name));
 }
 assert.equal(imageMime('logo.png','image/jpeg'),null);assert.equal(imageMime('a.hvif',''),null);
 assert.equal(imageMime('a.avif',''),'image/avif');assert.equal(fileMatchesAccept({name:'cv.pdf',type:'application/pdf'},'.pdf,application/pdf'),true);
 assert.equal(fileMatchesAccept({name:'script.html',type:'text/html'},imageAccept),false);
 assert.throws(()=>imageUploadOptions(new File(['x'],'a.heic',{type:'image/heic'})),/compatível/);
 assert.throws(()=>imageUploadOptions(new File([new Uint8Array(1048577)],'a.svg',{type:'image/svg+xml'})),/1 MB/);
});
test('plain-text and HTML upstream failures never leak JSON parser exceptions',async()=>{
 await assert.rejects(apiResponse(new Response('Forbidden',{status:403})),/não tem permissão/);
 await assert.rejects(apiResponse(new Response('<html>down</html>',{status:503})),/temporariamente ocupado/);
 await assert.rejects(apiResponse(new Response('not json')),/Não foi possível concluir/);
 await assert.rejects(apiResponse(Response.json({message:'Quota atingida'},{status:429})),/Quota atingida/);
 assert.deepEqual(await apiResponse(Response.json({asset:{id:'safe'}})),{asset:{id:'safe'}});
});

test('customer icon accepts square sources and rejects horizontal wordmarks',async()=>{const original=await sharp({create:{width:240,height:80,channels:3,background:'#4169e1'}}).png().toBuffer();await assert.rejects(squareBrandingIcon(original),/Square icon required/);const square=await sharp({create:{width:80,height:80,channels:3,background:'#4169e1'}}).png().toBuffer();const meta=await sharp(await squareBrandingIcon(square)).metadata();assert.equal(meta.width,64);assert.equal(meta.height,64);assert.equal(meta.format,'png');assert.equal((await sharp(original).metadata()).width,240);});

import {publicError,readApi} from '../app/lib/api-response.ts';
import {formatInput,inputFormatRules} from '../app/components/ui/input-format.ts';
test('input masks handle raw/pasted/formatted values without accepting excess digits',()=>{
 for(const [format,raw,expected]of [['cpf','12345678901','123.456.789-01'],['cnpj','12345678000190','12.345.678/0001-90'],['phone','11987654321','(11) 98765-4321'],['phone','1134567890','(11) 3456-7890'],['otp','a123 4567','123456']]){assert.equal(formatInput(raw,format),expected);assert.equal(formatInput(expected,format),expected);assert.match(expected,new RegExp('^(?:'+inputFormatRules[format].pattern+')$','v'));assert.equal(formatInput('',format),'')}
 assert.equal(formatInput('123456780001901111','cnpj'),'12.345.678/0001-90');
});
test('errors translate busy/network/parser failures and preserve actionable Portuguese',async()=>{
 assert.match(publicError('Service busy'),/muitas solicitações/);assert.match(publicError('Failed to fetch'),/internet/);
 for(const raw of ['Unexpected token F, Forbidden is not valid JSON','Error at private.server:5432 token=secret','<html>Bad gateway</html>','unreviewed upstream message'])assert.equal(publicError(raw),'Não foi possível concluir. Tente novamente.');
 assert.equal(publicError('Informe um CNPJ válido com 14 dígitos.'),'Informe um CNPJ válido com 14 dígitos.');
 await assert.rejects(apiResponse(Response.json({message:'Service busy'},{status:503})),/muitas solicitações/);
});
test('safe reads retry once, never replay writes/rate limits, and abort delayed work',async()=>{
 const original=globalThis.fetch;try{
 let calls=0;globalThis.fetch=async(_url,options)=>{assert.equal(options.method,undefined);return ++calls===1?Response.json({message:'Service busy'},{status:503}):Response.json({ok:true})};
 assert.deepEqual(await readApi('/fixture','Falha'),{ok:true});assert.equal(calls,2);
 calls=0;globalThis.fetch=async()=>{calls++;return new Response('busy',{status:503})};await assert.rejects(readApi('/fixture','Falha'),/ocupado/);assert.equal(calls,2);
 calls=0;globalThis.fetch=async()=>{calls++;return new Response('rate',{status:429})};await assert.rejects(readApi('/fixture','Falha'),/um minuto/);assert.equal(calls,1);
 calls=0;const controller=new AbortController();globalThis.fetch=async()=>{calls++;setTimeout(()=>controller.abort(),5);return new Response('busy',{status:503})};await assert.rejects(readApi('/fixture','Falha',controller.signal),{name:'AbortError'});assert.equal(calls,1);
 }finally{globalThis.fetch=original}
});

import {webImage,optimizedImageResponse,acceptsWebp} from '../app/lib/web-image.ts';
test('web delivery negotiates format, preserves originals/alpha and only keeps smaller derivatives',async()=>{
 const png=await sharp({create:{width:1600,height:540,channels:4,background:{r:22,g:110,b:120,alpha:.5}}}).composite([{input:Buffer.from('<svg width="1600" height="540"><text x="100" y="200" font-size="90" fill="white">Banner de exemplo</text></svg>')}]).png().toBuffer();
 const original=Buffer.from(png),result=await webImage(png,'image/avif,image/webp,image/png');assert.equal(result.type,'image/webp');assert.ok(result.bytes.length<png.length);const meta=await sharp(result.bytes).metadata();assert.equal(meta.width,1600);assert.equal(meta.height,540);assert.equal(meta.hasAlpha,true);assert.deepEqual(png,original);
 assert.deepEqual(await webImage(png,'image/png'),{bytes:png,type:'image/png'});assert.equal(acceptsWebp('image/webp;q=0,image/png'),false);assert.equal(acceptsWebp('*/*'),false);
 assert.deepEqual((await webImage(png,'image/webp')).bytes,result.bytes);
 const response=await optimizedImageResponse(png,new Headers({'Cache-Control':'private, no-store',Vary:'Cookie'}),'image/webp');assert.equal(response.headers.get('Content-Type'),'image/webp');assert.equal(response.headers.get('Vary'),'Cookie, Accept');assert.equal(response.headers.get('Cache-Control'),'private, no-store');
 const tiny=await sharp({create:{width:1,height:1,channels:3,background:'red'}}).png().toBuffer();assert.equal((await webImage(tiny,'image/webp')).type,'image/png');
});
