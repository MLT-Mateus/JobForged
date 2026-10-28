/** Temporary release window: public business requests never reach the app.
 * Only login, personal MFA enrollment, public assets and status remain usable.
 * No database/service credentials, request logs or browser bypass flags.
 */
import http from 'node:http';
import { pipeline } from 'node:stream';

const reads=new Set(['/login','/backoffice/seguranca','/401','/403','/404','/500','/503','/api/health','/api/auth/session','/api/backoffice/security','/api/platform/settings','/favicon.svg']);
const writes=new Set(['/api/auth/sign-in','/api/auth/sign-out','/api/backoffice/security']);
export function maintenanceTarget(method,path){
 if((method==='GET'||method==='HEAD')&&(reads.has(path)||path.startsWith('/assets/')||path.startsWith('/brand/')))return path;
 if(method==='POST'&&writes.has(path))return path;
 return null;
}

export function createMaintenanceServer(upstream){
 const target=new URL(upstream);
 if(target.protocol!=='http:'||target.username||target.password||target.pathname!=='/')throw Error('Private HTTP app origin required');
 return http.createServer((req,res)=>{
  if(!req.url?.startsWith('/')||req.url.startsWith('//')||/[\\\u0000-\u001f]/.test(req.url)){res.writeHead(400);res.end();return;}
  const url=new URL(req.url,'http://maintenance.internal');
  if(url.pathname.includes('%')){res.writeHead(400);res.end();return;}
  if(url.pathname==='/healthz'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end('{"status":"maintenance"}');return;}
  const allowed=maintenanceTarget(req.method,url.pathname);
  if(!allowed&&(url.pathname.startsWith('/api/')||!['GET','HEAD'].includes(req.method))){
   res.writeHead(503,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end('{"message":"Manutenção temporária. Tente novamente em instantes."}');return;
  }
  const path=allowed?url.pathname+url.search:'/503';
  const headers={...req.headers};delete headers.connection;delete headers['transfer-encoding'];
  if(!allowed){delete headers['content-length'];delete headers['content-type'];}
  const forwarded=http.request({hostname:target.hostname,port:target.port||80,path,method:allowed?req.method:'GET',headers,timeout:15000},response=>{
   res.writeHead(allowed?response.statusCode:503,{...response.headers,'cache-control':'no-store'});
   pipeline(response,res,()=>{});
  });
  forwarded.on('timeout',()=>forwarded.destroy());
  forwarded.on('error',()=>{if(res.writableEnded||res.destroyed)return;if(!res.headersSent)res.writeHead(503,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});res.end('JobForged: manutenção temporária. Tente novamente em instantes.');});
  if(allowed&&req.method==='POST'){
   let bytes=0;req.on('data',chunk=>{bytes+=chunk.length;if(bytes>65536){forwarded.destroy();if(!res.headersSent)res.writeHead(413);res.end();req.destroy();}});
   pipeline(req,forwarded,()=>{});
  }else{req.resume();forwarded.end();}
 });
}

if(process.env.JBFD_MAINTENANCE_LISTEN==='true'){
 const server=createMaintenanceServer(process.env.UPSTREAM_APP_URL);
 server.requestTimeout=20000;server.headersTimeout=10000;
 server.listen(8080,'0.0.0.0');
}
