import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import { crc32,inflateSync } from 'node:zlib';
import {passwordRules} from '../../shared/password-policy.mjs';
export {passwordRules};

export function clientAddress(peer, forwarded, trustedPeers) {
  const normalized = peer?.replace(/^::ffff:/, '') || 'unknown';
  if (!trustedPeers.has(normalized)) return normalized;
  // The immediate trusted reverse proxy appends the actual client last.
  const last = String(forwarded || '').split(',').at(-1)?.trim();
  return isIP(last || '') ? last : normalized;
}

export function limitsFor(pathname, address, body, secret, method='POST') {
  const checks=[];
  const scope=(value)=>createHmac('sha256',secret).update(value).digest('hex');
  const add=(category,value)=>checks.push([category,scope(value)]);
  add(pathname.startsWith('/auth/v1/')&&method!=='GET'&&method!=='HEAD'?'auth-ip':'api-ip',address);
  if(method==='GET'||method==='HEAD')return checks;
  const email=typeof body?.email==='string'?body.email.trim().toLowerCase().slice(0,320):null;
  if(pathname==='/auth/v1/signup')add('signup-ip',address);
  if(pathname==='/auth/v1/token'&&email)add('login-account',email);
  if(['/auth/v1/recover','/auth/v1/resend','/auth/v1/otp'].includes(pathname)&&email)add('recovery-account',email);
  if(pathname==='/auth/v1/verify'||pathname.includes('/factors/'))add('verify-ip',address);
  if(pathname.startsWith('/storage/v1/object/'))add('upload-ip',address);
  return checks;
}

export function policyPath(path){
 path=path.replace(/\/+$/,'')||'/';
 const aliases={
  '/api/auth/sign-in':'/auth/v1/token','/api/auth/sign-up':'/auth/v1/signup',
  '/api/auth/invitee-sign-up':'/auth/v1/signup','/api/auth/recover':'/auth/v1/recover',
  '/api/auth/confirmation/resend':'/auth/v1/resend','/api/auth/confirmation/session':'/auth/v1/verify',
  '/api/auth/recovery/session':'/auth/v1/verify','/api/auth/recovery/password':'/auth/v1/user',
  '/api/backoffice/security':'/auth/v1/factors',
  '/rest/v1/rpc/create_company_signup_intent':'/auth/v1/signup',
 };
 return aliases[path]||path;
}

// These are unverified hints for an additional denial predicate only. They
// never authorize a request; native Auth must verify the unchanged JWT next.
export function sessionClaimHints(authorization){
  if(typeof authorization!=='string'||!authorization.startsWith('Bearer '))return null;
  try{
    const parts=authorization.slice(7).split('.');if(parts.length!==3)return null;
    const claims=JSON.parse(Buffer.from(parts[1],'base64url').toString('utf8'));
    const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    if(!uuid.test(claims.sub)||!uuid.test(claims.session_id))return null;
    return {person:claims.sub,session:claims.session_id,aal:claims.aal==='aal2'?'aal2':'aal1'};
  }catch{return null;}
}

export function privilegedCredential(token){
 try{const parts=token?.replace(/^Bearer /,'').split('.');if(parts?.length!==3)return false;
  const role=JSON.parse(Buffer.from(parts[1],'base64url').toString('utf8')).role;
  return typeof role==='string'&&!['anon','authenticated'].includes(role);
 }catch{return false;}
}

export function validStaticPng(bytes){
 try{
  if(bytes.length<57||bytes.length>5242880||!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return false;
  let offset=8,width=0,height=0,depth=0,color=0,palette=false,total=0;const data=[];
  while(offset+12<=bytes.length){
   const length=bytes.readUInt32BE(offset),type=bytes.toString('ascii',offset+4,offset+8),end=offset+12+length;
   if(end>bytes.length||crc32(bytes.subarray(offset+4,end-4))!==bytes.readUInt32BE(end-4))return false;
   if(['acTL','fcTL','fdAT'].includes(type))return false;
   if(offset===8&&(type!=='IHDR'||length!==13))return false;
   if(type==='IHDR'){
    if(offset!==8||length!==13)return false;
    width=bytes.readUInt32BE(offset+8);height=bytes.readUInt32BE(offset+12);depth=bytes[offset+16];color=bytes[offset+17];
    if(!width||!height||width>4096||height>4096||bytes[offset+18]!==0||bytes[offset+19]!==0||bytes[offset+20]!==0)return false;
    const depths={0:[1,2,4,8,16],2:[8,16],3:[1,2,4,8],4:[8,16],6:[8,16]};if(!depths[color]?.includes(depth))return false;
   }else if(type==='PLTE'){if(length<3||length>768||length%3)return false;palette=true;}
   else if(type==='IDAT'){data.push(bytes.subarray(offset+8,end-4));total+=length;}
   else if(type==='IEND'){
    if(length||end!==bytes.length||!total||(color===3&&!palette))return false;
    const channels={0:1,2:3,3:1,4:2,6:4}[color],row=Math.ceil(width*depth*channels/8)+1,expected=row*height;
    if(expected>68000000)return false;
    const raw=inflateSync(Buffer.concat(data),{maxOutputLength:expected});
    if(raw.length!==expected)return false;
    for(let y=0;y<height;y++)if(raw[y*row]>4)return false;
    return true;
   }else if(type[0]===type[0]?.toUpperCase())return false;
   offset=end;
  }
  return false;
 }catch{return false;}
}
