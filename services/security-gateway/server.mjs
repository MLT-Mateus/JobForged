import http from 'node:http';
import { lookup } from 'node:dns/promises';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import pg from 'pg';
import { clientAddress, limitsFor,sessionClaimHints,policyPath,validStaticPng,passwordRules,privilegedCredential,anonymousReadHint } from './policy.mjs';

const secret=process.env.RATE_SCOPE_SECRET;
const environment=process.env.APP_ENV;
const upstream=new URL(process.env.UPSTREAM_URL||'http://supabase-envoy:8000');
if(!secret||secret.length<64||!process.env.DATABASE_URL)throw new Error('Gateway configuration missing');
const expectedHost=environment==='test'?'supabase-envoy':environment==='live'?'supabase-live-envoy':null;
if(!expectedHost||upstream.protocol!=='http:'||upstream.hostname!==expectedHost)throw new Error('Unexpected environment upstream');
const appHost=environment==='test'?'jbfd-test-app-1':'jbfd-live-app-1';
const applicationUpstream=new URL(process.env.APPLICATION_URL||`http://${appHost}:3000`);
if(applicationUpstream.protocol!=='http:'||applicationUpstream.hostname!==appHost)throw new Error('Unexpected application upstream');
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:6,connectionTimeoutMillis:2000,query_timeout:2000,statement_timeout:1500});
pool.on('error',()=>console.error('Gateway database connection unavailable'));
let trustedPeers=new Set(),bffPeers=new Set();
async function refreshTrustedPeers(){
 const addresses=await lookup(process.env.TRUSTED_PROXY_HOST||'traefik',{all:true});
 trustedPeers=new Set(addresses.map(a=>a.address));
 if(process.env.TRUSTED_BFF_HOST){
  const peers=await lookup(process.env.TRUSTED_BFF_HOST,{all:true}).catch(()=>[]);bffPeers=new Set(peers.map(a=>a.address));
 }
}
await refreshTrustedPeers();
const refresh=setInterval(()=>refreshTrustedPeers().catch(()=>{trustedPeers=new Set();}),60000);refresh.unref();
let active=0,activeApplication=0,applicationUploads=0,nativeUploads=0;
const clientRequests=new Map();
const reply=(res,status,message)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store',...(status===429?{'Retry-After':'60'}:{})});res.end(JSON.stringify({message}));};
const server=http.createServer(async(req,res)=>{
 if(req.url==='/healthz'){
  try{await pool.query('select 1');reply(res,200,'healthy');}catch{reply(res,503,'unavailable');}return;
 }
 const rawPath=(req.url||'/').split('?')[0].replace(/\/+$/,'')||'/',application=rawPath.startsWith('/api/');
 const uploading=req.method==='POST'&&(rawPath.startsWith('/storage/v1/object/')||rawPath.endsWith('/assets'));
 const address=clientAddress(req.socket.remoteAddress,req.headers['x-forwarded-for'],trustedPeers);
 const clientKey=(application?'app:':'native:')+address;
 const bffRequest=!application&&bffPeers.has(req.socket.remoteAddress?.replace(/^::ffff:/,''));
 const ownCount=clientRequests.get(clientKey)||0;
 const countedUpload=uploading&&(application||!bffRequest);
 if((application?activeApplication>=16:active>=24)||ownCount>=(bffRequest?24:8)||(countedUpload&&(application?applicationUploads>=2:nativeUploads>=1))){reply(res,503,'Service busy');return;}
 if(application)activeApplication++;else active++;
 if(countedUpload){if(application)applicationUploads++;else nativeUploads++;}
 clientRequests.set(clientKey,ownCount+1);
 try{
  if((req.url||'/').split('?')[0].match(/[%\\]|\/{2,}/)){reply(res,400,'Invalid API path');return;}
  const destination=application?applicationUpstream:upstream;
  const url=new URL(req.url||'/',destination);
  if(url.origin!==destination.origin||(!application&&!['/auth/v1','/rest/v1','/storage/v1','/realtime/v1','/functions/v1','/graphql/v1'].some(p=>url.pathname===p||url.pathname.startsWith(p+'/')))){reply(res,404,'Not found');return;}
  const canonicalPath=url.pathname.replace(/\/+$/,'')||'/';
  if(!application&&(canonicalPath.startsWith('/auth/v1/admin')||privilegedCredential(req.headers.authorization)||privilegedCredential(req.headers.apikey))){reply(res,403,'Private administration required');return;}
  if(!application&&canonicalPath.startsWith('/storage/v1/')&&
    !/^\/storage\/v1\/object\/(?:authenticated\/)?company-branding\/(?:platform|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.png$/.test(canonicalPath)){
   reply(res,403,'Storage operation unavailable');return;
  }
  // Anonymous GETs still require an upstream verified anon JWT and published-image RLS.
  const publicImageRead=anonymousReadHint(req.headers.authorization)&&req.method==='GET'&&/^\/storage\/v1\/object\/company-branding\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.png$/.test(canonicalPath);
  if(!application&&canonicalPath.startsWith('/storage/v1/')&&!publicImageRead&&!sessionClaimHints(req.headers.authorization)){
   reply(res,401,'Session unavailable');return;
  }
  const consumed=new Set();
  async function budgets(body){
   if(bffRequest)return true;
   for(const[category,scope]of limitsFor(policyPath(url.pathname),address,body,secret,req.method)){
    const key=category+':'+scope;if(consumed.has(key))continue;
    const result=await pool.query('select app_private.gateway_rate_limit($1,$2) allowed',[category,scope]);
    if(result.rows[0]?.allowed!==true){reply(res,429,'Too many requests. Try again later.');return false;}
    consumed.add(key);
   }
   return true;
  }
  if(!await budgets(null))return;
  const auth=url.pathname.startsWith('/auth/v1/')||url.pathname.startsWith('/api/auth/')||url.pathname==='/api/backoffice/security';
  const maximum=auth?16384:uploading?(url.pathname.startsWith('/api/backoffice/')?10551296:6291456):131072;
  if(Number(req.headers['content-length']||0)>maximum){res.setHeader('Connection','close');reply(res,413,'Request too large');res.once('finish',()=>req.destroy());return;}
  const chunks=[];let size=0;
  for await(const chunk of req.iterator({destroyOnReturn:false})){size+=chunk.length;if(size>maximum){res.setHeader('Connection','close');reply(res,413,'Request too large');res.once('finish',()=>req.destroy());return;}chunks.push(chunk);}
  const body=Buffer.concat(chunks);let data=null;
  if(auth&&body.length){try{data=JSON.parse(body.toString('utf8'));}catch{reply(res,400,'Invalid request');return;}}
  if(auth&&typeof data?.password==='string'&&policyPath(canonicalPath)!=='/auth/v1/token'&&Object.values(passwordRules(data.password)).some(valid=>!valid)){
   reply(res,422,'Use at least 8 characters, uppercase, lowercase, number and symbol, up to 72 UTF-8 bytes');return;
  }
  if(!application&&uploading&&!bffRequest&&(req.headers['content-type']!=='image/png'||!validStaticPng(body))){reply(res,415,'Use a valid static PNG image');return;}
  if(!await budgets(data))return;
  if(canonicalPath==='/auth/v1/user'||canonicalPath==='/auth/v1/factors'||canonicalPath.startsWith('/auth/v1/factors/')){
   const hint=sessionClaimHints(req.headers.authorization);
   if(!hint){reply(res,401,'Session unavailable');return;}
   const sensitive=(canonicalPath==='/auth/v1/user'&&!['GET','HEAD'].includes(req.method))||
    (canonicalPath==='/auth/v1/factors'&&req.method==='POST')||req.method==='DELETE'||req.method==='PUT';
   const gate=await pool.query('select app_private.gateway_session_active($1,$2,$3,$4,$5) allowed',[hint.person,hint.session,hint.aal,sensitive,req.method+' '+canonicalPath]);
   if(gate.rows[0]?.allowed!==true){reply(res,401,'Session unavailable');return;}
  }
  const headers=new Headers();
  for(const [key,value]of Object.entries(req.headers)){
   if(['host','connection','transfer-encoding','content-length','x-forwarded-for','x-real-ip','forwarded'].includes(key)||value===undefined)continue;
   headers.set(key,Array.isArray(value)?value.join(','):value);
  }
  headers.set('x-forwarded-for',address);
  // Fetch may not decode every encoding advertised by modern browsers (zstd).
  // Request an uncompressed upstream body before stripping transport headers.
  // PNG assets are already compressed; this also avoids redundant processing.
  headers.set('accept-encoding','identity');
  if(application){headers.set('x-forwarded-host',req.headers.host||'');headers.set('x-forwarded-proto','https');}
  const response=await fetch(url,{method:req.method,headers,...(body.length?{body}:{}),redirect:'manual',signal:AbortSignal.timeout(30000)});
  for(const [key,value]of response.headers){if(!['connection','transfer-encoding','content-length','content-encoding','set-cookie'].includes(key))res.setHeader(key,value);}
  const cookies=response.headers.getSetCookie();if(cookies.length)res.setHeader('set-cookie',cookies);
  res.statusCode=response.status;
  if(response.body)await pipeline(Readable.fromWeb(response.body),res);else res.end();
 }catch{
  // Never emit request bodies, provider errors, credentials or token headers.
  if(!res.headersSent)reply(res,503,'Security gateway unavailable');else res.destroy();
 }finally{
  if(application)activeApplication--;else active--;
  if(countedUpload){if(application)applicationUploads--;else nativeUploads--;}
  const pending=(clientRequests.get(clientKey)||1)-1;if(pending)clientRequests.set(clientKey,pending);else clientRequests.delete(clientKey);
 }
});
server.requestTimeout=35000;server.headersTimeout=10000;server.maxHeadersCount=64;
let sockets=0;
server.on('upgrade',async(req,socket,head)=>{
 let counted=false;
 try{
  const url=new URL(req.url||'/',upstream);
  if(url.origin!==upstream.origin||!url.pathname.startsWith('/realtime/v1/')||sockets>=80){socket.destroy();return;}
  const address=clientAddress(req.socket.remoteAddress,req.headers['x-forwarded-for'],trustedPeers);
  for(const[category,scope]of limitsFor(url.pathname,address,null,secret,'GET')){
   const result=await pool.query('select app_private.gateway_rate_limit($1,$2) allowed',[category,scope]);
   if(result.rows[0]?.allowed!==true){socket.end('HTTP/1.1 429 Too Many Requests\r\nConnection: close\r\n\r\n');return;}
  }
  sockets++;counted=true;
  socket.once('close',()=>{sockets--;});
  const headers={...req.headers,host:upstream.host,'x-forwarded-for':address};delete headers.forwarded;delete headers['x-real-ip'];
  const connection=http.request(url,{method:'GET',headers,timeout:10000});
  connection.on('upgrade',(response,remote,upstreamHead)=>{
   connection.setTimeout(0);remote.setTimeout(0);socket.setTimeout(0);
   socket.write(`HTTP/1.1 ${response.statusCode} ${response.statusMessage}\r\n`);
   for(let i=0;i<response.rawHeaders.length;i+=2)socket.write(`${response.rawHeaders[i]}: ${response.rawHeaders[i+1]}\r\n`);
   socket.write('\r\n');if(upstreamHead.length)socket.write(upstreamHead);if(head.length)remote.write(head);
   remote.on('error',()=>socket.destroy());socket.on('error',()=>remote.destroy());socket.once('close',()=>remote.destroy());
   socket.pipe(remote).pipe(socket);
  });
  connection.on('response',()=>socket.destroy());connection.on('error',()=>socket.destroy());connection.on('timeout',()=>connection.destroy());connection.end();
 }catch{socket.destroy();if(counted&&!socket.destroyed)sockets--;}
});
server.listen(Number(process.env.PORT||8080),'0.0.0.0');
async function shutdown(){server.close();await pool.end();process.exit(0);}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
