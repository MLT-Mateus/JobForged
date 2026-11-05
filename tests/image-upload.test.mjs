import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {normalizeBrandingImage,squareBrandingIcon} from '../app/lib/branding-image.ts';
import {imageAccept,imageMime,fileMatchesAccept,imageUploadOptions} from '../shared/image-upload.ts';
import {apiResponse} from '../app/lib/api-response.ts';
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
 await assert.rejects(apiResponse(new Response('Forbidden',{status:403})),/Envio não autorizado/);
 await assert.rejects(apiResponse(new Response('<html>down</html>',{status:503})),/temporariamente indisponível/);
 await assert.rejects(apiResponse(new Response('not json')),/Não foi possível concluir/);
 await assert.rejects(apiResponse(Response.json({message:'Quota atingida'},{status:429})),/Quota atingida/);
 assert.deepEqual(await apiResponse(Response.json({asset:{id:'safe'}})),{asset:{id:'safe'}});
});

test('customer icon accepts square sources and rejects horizontal wordmarks',async()=>{const original=await sharp({create:{width:240,height:80,channels:3,background:'#4169e1'}}).png().toBuffer();await assert.rejects(squareBrandingIcon(original),/Square icon required/);const square=await sharp({create:{width:80,height:80,channels:3,background:'#4169e1'}}).png().toBuffer();const meta=await sharp(await squareBrandingIcon(square)).metadata();assert.equal(meta.width,64);assert.equal(meta.height,64);assert.equal(meta.format,'png');assert.equal((await sharp(original).metadata()).width,240);});
