import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import {brandingDefaults,brandContent,brandingStyle,validateBranding,contrast,foreground} from '../app/components/personalization/branding-model.ts';
import {fontPairs} from '../app/components/ui/font-pairs.ts';
import {normalizeBrandingImage} from '../app/lib/branding-image.ts';
test('defaults are company-specific, with no demo assets or local cross-company data',()=>{
 const a=brandingDefaults('company-a','Empresa A'),b=brandingDefaults('company-b','Empresa B');
 assert.equal(a.organizationId,'company-a');assert.equal(b.displayName,'Empresa B');assert.deepEqual(a.banners,[]);assert.equal(a.assets.logoMain,null);
 assert.equal(validateBranding(brandContent(a)),null);assert.equal(a.portal.customDomain,'');assert.equal(a.portal.jobforgedDomain,'');
 a.palette.text='#ffffff';assert.notEqual(b.palette.text,'#ffffff');
});
test('four approved pairs and accessible foregrounds use shared tokens in both themes',()=>{
 assert.equal(fontPairs.length,4);
 for(const pair of fontPairs){const c=brandingDefaults('company-a','Empresa A');c.typography.fontPair=pair.id;for(const theme of ['light','dark']){const style=brandingStyle(c,theme);assert.equal(style['--jf-ui-font-heading'],pair.heading);assert.equal(style['--jf-ui-font-body'],pair.body)}}
 for(const background of ['#777777','#20B2AA','#000000','#FFFFFF','#FF0000'])assert.ok(contrast(background,foreground(background))>=4.5);
 const c=brandingDefaults('a','A');c.theme.light.text=c.theme.light.surface;assert.match(validateBranding(brandContent(c)),/contraste/);
});
test('image pipeline accepts static raster, strips metadata, rejects SVG, mismatched and oversized input',async()=>{
 for(const format of ['png','jpeg','webp']){
  const bytes=await sharp({create:{width:4,height:4,channels:3,background:'#20B2AA'}})[format]().toBuffer();
  const normalized=await normalizeBrandingImage(bytes,format==='jpeg'?'image/jpeg':`image/${format}`);const metadata=await sharp(normalized).metadata();assert.equal(metadata.format,'png');assert.equal(metadata.exif,undefined);
 }
 await assert.rejects(normalizeBrandingImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'),'image/png'));
 await assert.rejects(normalizeBrandingImage(Buffer.alloc(5242881),'image/png'));
 const png=await sharp({create:{width:2,height:2,channels:3,background:'#000000'}}).png().toBuffer();await assert.rejects(normalizeBrandingImage(png,'image/jpeg'));await assert.rejects(normalizeBrandingImage(png.subarray(0,12),'image/png'));
});
