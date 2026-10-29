import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import {brandingDefaults,brandContent,brandingStyle,validateBranding,contrast,foreground} from '../app/components/personalization/branding-model.ts';
import {fontPairs} from '../app/components/ui/font-pairs.ts';
import {normalizeBrandingImage} from '../app/lib/branding-image.ts';
test('defaults are company-specific, with no demo assets or local cross-company data',()=>{
 const a=brandingDefaults('company-a','Empresa A'),b=brandingDefaults('company-b','Empresa B');
 assert.equal(a.organizationId,'company-a');assert.equal(b.displayName,'Empresa B');assert.equal(a.banners[0].id,'default-culture');assert.match(a.banners[0].description,/mock/);assert.equal(a.assets.logoMain,null);
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

test('presentation controls are additive, validated and preserve old snapshots',async()=>{
 const {defaultPortalPresentation,portalPresentation}=await import('../app/components/personalization/portal-presentation.ts');
 const {validPortalSlug,reservedPortalSlugs}=await import('../app/lib/company-portal.ts');
 const config=brandContent(brandingDefaults('fixture','Fixture'));
 assert.equal(portalPresentation(config.portal).showImage,true);
 config.portal.presentation={...defaultPortalPresentation,showImage:false,jobsLayout:'list'};assert.equal(validateBranding(config),null);
 config.portal.presentation.showImage='yes';assert.match(validateBranding(config),/composição/);
 for(const slug of reservedPortalSlugs)assert.equal(validPortalSlug(slug),false);
 for(const slug of ['company-name','jobforged','empresa-2'])assert.equal(validPortalSlug(slug),true);
 for(const slug of ['ab','UPPER','-bad','bad-','company/path','émpresa'])assert.equal(validPortalSlug(slug),false);
});

test('chrome, navigation and reset defaults are bounded and theme specific',async()=>{
 const {portalChrome,portalMenu,portalFooter}=await import('../app/components/personalization/portal-chrome.ts');
 const {isDefaultBranding,normalizeBrandingRichContent}=await import('../app/components/personalization/branding-model.ts');
 const c=brandingDefaults('fixture','Fixture');assert.equal(isDefaultBranding(c,'Fixture'),true);const legacy=structuredClone(c);delete legacy.portal.footer;assert.equal(isDefaultBranding(legacy,'Fixture'),true);assert.equal(isDefaultBranding({...c,revision:42,publishedAt:'ignored'},'Fixture'),true);
 assert.equal(isDefaultBranding({...normalizeBrandingRichContent(c),organizationId:c.organizationId},'Fixture'),true);
 c.portal.chrome=portalChrome(c);c.portal.navigation=portalMenu(c);assert.equal(isDefaultBranding(c,'Fixture'),true);
 c.portal.navigation[0].href='https://example.invalid/culture';assert.equal(validateBranding(brandContent(c)),null);assert.equal(isDefaultBranding(c,'Fixture'),false);
 c.portal.navigation[0].href='javascript:alert(1)';assert.match(validateBranding(brandContent(c)),/cabeçalho/);c.portal.navigation=[];
 c.portal.chrome.light.headerText=c.portal.chrome.light.headerBackground;assert.match(validateBranding(brandContent(c)),/contraste/);
 const f=portalFooter(brandingDefaults('fixture','Fixture'));assert.ok(f.description.length>20);assert.ok(f.links.every(link=>link.href.startsWith('/')||link.href.startsWith('https://')));assert.equal(f.email,'');assert.equal(f.phone,'');
});
