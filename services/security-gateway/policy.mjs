import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';

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
  add(pathname.startsWith('/auth/v1/')?'auth-ip':'api-ip',address);
  if(method==='GET'||method==='HEAD')return checks;
  const email=typeof body?.email==='string'?body.email.trim().toLowerCase().slice(0,320):null;
  if(pathname==='/auth/v1/signup')add('signup-ip',address);
  if(pathname==='/auth/v1/token'&&email)add('login-account',email);
  if(['/auth/v1/recover','/auth/v1/resend','/auth/v1/otp'].includes(pathname)&&email)add('recovery-account',email);
  if(pathname==='/auth/v1/verify'||pathname.includes('/factors/'))add('verify-ip',address);
  if(pathname.startsWith('/storage/v1/object/'))add('upload-ip',address);
  return checks;
}
