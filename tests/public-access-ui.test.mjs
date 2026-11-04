import test from 'node:test';
import assert from 'node:assert/strict';
test('company guest access is a login-first modal with text links; LP access stays standalone',async()=>{
 const {default:worker}=await import('../dist/server/index.js');
 const get=path=>worker.fetch(new Request('http://localhost'+path),{ASSETS:{fetch:()=>new Response('',{status:404})}},{waitUntil(){},passThroughOnException(){}});
 const widgets=await get('/design-system/widgets');assert.equal(widgets.status,200);const html=await widgets.text();
 assert.match(html,/Entre na sua conta/);assert.match(html,/jf-widget-dialog--modal/);assert.match(html,/Cadastre-se/);assert.match(html,/Esqueci minha senha/);assert.doesNotMatch(html,/Acesso à conta/);
 const login=await get('/login');assert.equal(login.status,200);const lp=await login.text();assert.match(lp,/auth-official-header/);assert.doesNotMatch(lp,/jf-portal-access-links/);
});
