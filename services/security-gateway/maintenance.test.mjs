import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import {createMaintenanceServer,maintenanceTarget} from './maintenance-server.mjs';

test('release maintenance blocks business and direct providers without a bypass flag',async()=>{
 for(const path of ['/api/company/branding','/auth/v1/token','/rest/v1/rpc/platform_manage','/storage/v1/object/x','/api/auth/sign-up'])assert.equal(maintenanceTarget('POST',path),null,path);
 assert.equal(maintenanceTarget('POST','/api/backoffice/security'),'/api/backoffice/security');
 const calls=[];
 const app=http.createServer((req,res)=>{calls.push(req.url);res.writeHead(req.url==='/503'?503:200,{'Content-Type':'text/plain'});res.end(req.url);});
 await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));
 const maintenance=createMaintenanceServer('http://127.0.0.1:'+app.address().port);
 await new Promise(resolve=>maintenance.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+maintenance.address().port;
 try{
  assert.equal((await fetch(base+'/api/company/branding',{method:'POST',headers:{'x-bypass-maintenance':'true'}})).status,503);
  assert.equal((await fetch(base+'/api/company/branding')).status,503);
  assert.equal(calls.length,0);
  assert.equal((await fetch(base+'/assets/%2f..%2fapi/company')).status,400);
  const home=await fetch(base+'/app/home');assert.equal(home.status,503);assert.equal(await home.text(),'/503');
  const security=await fetch(base+'/backoffice/seguranca');assert.equal(security.status,200);
  const code=await fetch(base+'/api/backoffice/security',{method:'POST',body:'fixture'});assert.equal(code.status,200);
  assert.equal((await fetch(base+'/assets/fixture.js')).status,200);
  assert.equal((await fetch(base+'/healthz')).status,200);
  assert.deepEqual(calls,['/503','/backoffice/seguranca','/api/backoffice/security','/assets/fixture.js']);
 }finally{await Promise.all([new Promise(resolve=>maintenance.close(resolve)),new Promise(resolve=>app.close(resolve))]);}
});
