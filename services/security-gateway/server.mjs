import http from 'node:http';
import { lookup } from 'node:dns/promises';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import pg from 'pg';
import { clientAddress, limitsFor } from './policy.mjs';

const secret=process.env.RATE_SCOPE_SECRET;
const upstream=new URL(process.env.UPSTREAM_URL||'http://supabase-envoy:8000');
if(!secret||secret.length<64||!process.env.DATABASE_URL)throw new Error('Gateway configuration missing');
if(upstream.protocol!=='http:'||upstream.hostname!=='supabase-envoy')throw new Error('Unexpected Test upstream');
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:6,connectionTimeoutMillis:2000,query_timeout:2000,statement_timeout:1500});
pool.on('error',()=>console.error('Gateway database connection unavailable'));
let trustedPeers=new Set();
async function refreshTrustedPeers(){
 const addresses=await lookup(process.env.TRUSTED_PROXY_HOST||'traefik',{all:true});
 trustedPeers=new Set(addresses.map(a=>a.address));
}
await refreshTrustedPeers();
const refresh=setInterval(()=>refreshTrustedPeers().catch(()=>{trustedPeers=new Set();}),60000);refresh.unref();
let active=0;
const reply=(res,status,message)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store',...(status===429?{'Retry-After':'60'}:{})});res.end(JSON.stringify({message}));};
const server=http.createServer(async(req,res)=>{
 if(req.url==='/healthz'){
  try{await pool.query('select 1');reply(res,200,'healthy');}catch{reply(res,503,'unavailable');}return;
 }
 if(active>=24){reply(res,503,'Service busy');return;}
 active++;
 try{
  const url=new URL(req.url||'/',upstream);
  if(url.origin!==upstream.origin||!['/auth/v1','/rest/v1','/storage/v1','/realtime/v1','/functions/v1','/graphql/v1'].some(p=>url.pathname===p||url.pathname.startsWith(p+'/'))){reply(res,404,'Not found');return;}
  const auth=url.pathname.startsWith('/auth/v1/');
  const maximum=auth?16384:6291456;
  const chunks=[];let size=0;
  for await(const chunk of req){size+=chunk.length;if(size>maximum){reply(res,413,'Request too large');return;}chunks.push(chunk);}
  const body=Buffer.concat(chunks);let data=null;
  if(auth&&body.length){try{data=JSON.parse(body.toString('utf8'));}catch{reply(res,400,'Invalid request');return;}}
  const address=clientAddress(req.socket.remoteAddress,req.headers['x-forwarded-for'],trustedPeers);
  for(const [category,scope] of limitsFor(url.pathname,address,data,secret,req.method)){
   const result=await pool.query('select app_private.gateway_rate_limit($1,$2) allowed',[category,scope]);
   if(result.rows[0]?.allowed!==true){reply(res,429,'Too many requests. Try again later.');return;}
  }
  const headers=new Headers();
  for(const [key,value]of Object.entries(req.headers)){
   if(['host','connection','transfer-encoding','content-length','x-forwarded-for','x-real-ip','forwarded'].includes(key)||value===undefined)continue;
   headers.set(key,Array.isArray(value)?value.join(','):value);
  }
  headers.set('x-forwarded-for',address);
  const response=await fetch(url,{method:req.method,headers,...(body.length?{body}:{}),redirect:'manual',signal:AbortSignal.timeout(30000)});
  for(const [key,value]of response.headers){if(!['connection','transfer-encoding','content-length','content-encoding','set-cookie'].includes(key))res.setHeader(key,value);}
  const cookies=response.headers.getSetCookie();if(cookies.length)res.setHeader('set-cookie',cookies);
  res.statusCode=response.status;
  if(response.body)await pipeline(Readable.fromWeb(response.body),res);else res.end();
 }catch{
  // Never emit request bodies, provider errors, credentials or token headers.
  if(!res.headersSent)reply(res,503,'Security gateway unavailable');else res.destroy();
 }finally{active--;}
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
