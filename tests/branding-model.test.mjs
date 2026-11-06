import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import {brandingIcon,brandingLogo,brandingDefaults,brandContent,brandingStyle,validateBranding,contrast,foreground} from '../app/components/personalization/branding-model.ts';
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

import {brandingIssue} from '../app/components/personalization/branding-model.ts';
test('validation identifies exact controls in hidden groups and rich content',async()=>{
 const {portalChrome}=await import('../app/components/personalization/portal-chrome.ts');
 const d=brandingDefaults('fixture','Example');d.shortName='';assert.equal(brandingIssue(brandContent(d)).path,'shortName');
 d.shortName='Example';d.portal.headline='x'.repeat(91);assert.equal(brandingIssue(brandContent(d)).path,'portal.headline');
 d.portal.headline='Example';d.portal.navigation=[{label:'Broken',href:'javascript:alert(1)'}];assert.equal(brandingIssue(brandContent(d)).path,'portal.navigation.0.href');
 d.portal.navigation=[];d.portal.chrome=portalChrome(d);d.portal.chrome.light.headerText=d.portal.chrome.light.headerBackground;assert.equal(brandingIssue(brandContent(d)).path,'portal.chrome.light.headerText');
});

test('customer tab uses only its dedicated icon and dark wordmark falls back to light',()=>{const c=brandingDefaults('x','X');c.assets.logoLight={url:'/api/company/branding/assets/38000000-0000-0000-0000-000000000041'};assert.equal(brandingLogo(c,'dark'),c.assets.logoLight.url);assert.equal(brandingIcon(c,'dark'),undefined);c.assets.favicon={url:'/api/company/branding/assets/38000000-0000-0000-0000-000000000042'};assert.equal(brandingIcon(c,'light'),c.assets.favicon.url);});

import {applyBrandColors,colorPresets,brandColors} from '../app/components/personalization/brand-colors.ts';
test('six palettes derive coherent light/dark chrome, text, buttons and links without changing page content',()=>{const original=brandingDefaults('colors','Colors'),before=structuredClone(original);for(const preset of colorPresets){const next=applyBrandColors(original,preset.colors);assert.equal(validateBranding(brandContent(next)),null,preset.name);assert.deepEqual(next.assets,original.assets);assert.deepEqual(next.banners,original.banners);assert.equal(next.portal.headline,original.portal.headline);assert.equal(next.revision,original.revision);for(const mode of ['light','dark']){const p=next.theme[mode];assert.equal(next.portal.chrome[mode].headerText,p.text);assert.equal(next.portal.chrome[mode].footerText,p.text);for(const background of [p.background,p.surface,p.activeItem])assert.ok(contrast(p.link,background)>=4.5);assert.ok(contrast(foreground(p.button),p.button)>=4.5);assert.ok(contrast(foreground(p.buttonHover),p.buttonHover)>=4.5)}}assert.deepEqual(original,before);assert.equal(colorPresets.length,6)});
test('partial hexadecimal editing preserves input without invalid derived NaN colors',()=>{const original=brandingDefaults('colors','Colors'),next=applyBrandColors(original,{...brandColors(original),primary:'#12'});assert.equal(next.palette.primary,'#12');assert.ok(!JSON.stringify(next).includes('NaN'));assert.ok(validateBranding(brandContent(next)))});

import {navigationColors} from '../app/components/ui/color-contrast.ts';
test('extreme action colors keep button text, boundaries and contextual navigation readable',()=>{for(const action of ['#000000','#FFFFFF','#777777','#FFFF00','#00FFFF','#FF00FF','#7C3AED']){const original=brandingDefaults('x','X');original.palette.button=action;for(const mode of ['light','dark']){original.theme[mode].button=action;const style=brandingStyle(original,mode);assert.ok(contrast(style['--jf-ui-action-primary-text'],action)>=4.5);assert.ok(contrast(style['--jf-ui-action-primary-border'],original.theme[mode].surface)>=3)}for(const background of ['#000000','#FFFFFF','#FDE047','#123456']){const n=navigationColors(action,background);assert.ok(contrast(n.interaction,background)>=4.5);assert.ok(contrast(n.interaction,n.hoverBackground)>=4.5)}}});

import {moveBannerTo} from '../app/components/personalization/banner-order.ts';
import {sectionColors} from '../app/components/ui/color-contrast.ts';
test('banner movement reinserts, preserves every item and normalizes sequence without mutating history',()=>{
 const items=[{id:'a',order:0,visible:true},{id:'b',order:1,visible:false},{id:'c',order:2,visible:true},{id:'d',order:3,visible:true}],snapshot=structuredClone(items);
 const next=moveBannerTo(items,0,3);assert.deepEqual(next.map(x=>x.id),['b','c','d','a']);assert.deepEqual(next.map(x=>x.order),[0,1,2,3]);assert.equal(next[0].visible,false);assert.deepEqual(items,snapshot);assert.deepEqual(moveBannerTo(next,3,0),items);assert.equal(moveBannerTo(items,-1,2),items);assert.equal(moveBannerTo(items,1,9),items);
});
test('section tones separate backgrounds and preserve normal text contrast in both themes',()=>{
 for(const background of ['#FFFFFF','#F5FAF9','#071411','#0E2722','#777777','#FFFF00']){const text=foreground(background),tones=sectionColors(background,text);for(const value of Object.values(tones)){assert.notEqual(value,background);assert.ok(contrast(value,text)>=4.5)}assert.notEqual(tones.subtle,tones.accent)}
 for(const theme of ['light','dark']){const style=brandingStyle(brandingDefaults('fixture','Fixture'),theme);assert.ok(style['--cp-section-subtle']);assert.notEqual(style['--cp-section-subtle'],style['--cp-bg'])}
});
