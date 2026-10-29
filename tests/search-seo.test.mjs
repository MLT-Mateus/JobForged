import {readFileSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {searchEnvironment,landingStructuredData,publicSearchPaths} from '../app/lib/seo.ts';

test('search indexing is limited to official Live, never enabled by URL alone',()=>{
 assert.equal(searchEnvironment('test','https://jobforged.com').indexable,false);
 assert.equal(searchEnvironment(undefined,'https://jobforged.com').indexable,false);
 for(const url of ['https://test.jobforged.com','https://jobforged.com.evil.invalid','http://jobforged.com','invalid'])assert.equal(searchEnvironment('live',url).indexable,false,url);
 assert.equal(searchEnvironment('live','https://jobforged.com').indexable,true);
 assert.equal(searchEnvironment('live',undefined).indexable,true);
 const graph=landingStructuredData('https://jobforged.com')['@graph'];
 assert.deepEqual(graph.find(x=>x['@type']==='WebSite').alternateName,['Job Forged']);
 assert.ok(!publicSearchPaths.includes('/design-system'));
});

test('rendered metadata, headers, canonicals and sitemaps obey environment at runtime',async()=>{
 const keys=['APP_ENV','APP_PUBLIC_URL','GOOGLE_SITE_VERIFICATION'];const before=keys.map(k=>process.env[k]);
 const {default:worker}=await import('../dist/server/index.js');
 const get=path=>worker.fetch(new Request('http://localhost'+path),{ASSETS:{fetch:()=>new Response('',{status:404})}},{waitUntil(){},passThroughOnException(){}});
 try{
  for(const environment of ['test','live']){
   process.env.APP_ENV=environment;const origin=environment==='live'?'https://jobforged.com':'https://test.jobforged.com';process.env.APP_PUBLIC_URL=origin;process.env.GOOGLE_SITE_VERIFICATION='fixture-verification-token';
   const response=await get('/');assert.equal(response.status,200);const html=await response.text();
   assert.match(html,/<title>JobForged \| ATS para recrutamento e seleção<\/title>/);
   assert.match(html,/Job Forged/);assert.match(html,/"@type":"WebSite"/);assert.match(html,/"@type":"Organization"/);
   const robots=html.match(/<meta[^>]*name="robots"[^>]*>/g)?.join('')||'';
   if(environment==='test'){assert.match(robots,/noindex/);assert.match(response.headers.get('x-robots-tag')||'',/noindex/);assert.doesNotMatch(html,/name="google-site-verification"/)}
   else {assert.doesNotMatch(robots,/noindex/);assert.equal(response.headers.get('x-robots-tag'),null);assert.match(html,/fixture-verification-token/)}
   const sitemap=await (await get('/sitemap.xml')).text();assert.equal(sitemap.includes('<loc>'),environment==='live');assert.ok(!sitemap.includes('/design-system'));assert.ok(!sitemap.includes('<lastmod>'));
   const robotsFile=await (await get('/robots.txt')).text();assert.equal(robotsFile.includes('Sitemap:'),environment==='live');assert.ok(!robotsFile.includes('Disallow: /'));
   const legal=await get('/termos-servico');const legalHtml=await legal.text();assert.ok(legalHtml.includes('href="'+origin+'/termos-servico"'));assert.ok(!legalHtml.includes('"@type":"WebSite"'));
   const login=await get('/login');assert.match(login.headers.get('x-robots-tag')||'',/noindex/);assert.match(await login.text(),/noindex/);
  }
 }finally{keys.forEach((k,i)=>before[i]===undefined?delete process.env[k]:process.env[k]=before[i])}
});

test('edge routes redirect HTTP and canonical www without matching other hosts',()=>{
 const compose=readFileSync(new URL('../deploy/compose.yml',import.meta.url),'utf8');
 const expression=compose.match(/canonical\.redirectregex\.regex=(.+)/)[1];
 assert.ok(new RegExp(expression).test('https://www.jobforged.com/a?b=c'));
 assert.ok(!new RegExp(expression).test('https://www.jobforged.com.evil.invalid/a'));
 assert.ok(compose.includes('-http.entrypoints=web'));
 assert.ok(compose.includes('-https.redirectscheme.scheme=https'));
 assert.ok(compose.includes('-https.redirectscheme.permanent=true'));
});
