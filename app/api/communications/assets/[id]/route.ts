import type { NextRequest } from 'next/server';
import { createHash } from 'node:crypto';
import { readSession, requestDatabase } from '@/app/api/auth/_server';
import { brandingStorage } from '@/app/api/company/branding/_storage';
export const runtime='nodejs';
export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const headers=new Headers({'Cache-Control':'private, no-store',Vary:'Cookie','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"}),session=await readSession(request,headers),{id}=await params;
 if(!session||(!session.company&&!session.platformAdmin))return new Response(null,{status:403,headers});
 if(!/^[0-9a-f-]{36}$/i.test(id))return new Response(null,{status:404,headers});
 const row=await requestDatabase('rpc/read_platform_banner_asset',session.accessToken,{asset_id:id}).catch(()=>null);
 if(!row?.ok)return new Response(null,{status:404,headers});
 const asset=await row.json() as {path:string;sha256:string;size:number}|null;
 if(!asset)return new Response(null,{status:404,headers});
 const stored=await brandingStorage(asset.path,session.accessToken);if(!stored?.ok)return new Response(null,{status:503,headers});
 const bytes=Buffer.from(await stored.arrayBuffer());
 if(bytes.byteLength!==asset.size||createHash('sha256').update(bytes).digest('hex')!==asset.sha256)return new Response(null,{status:503,headers});
 headers.set('Content-Type','image/png');return new Response(bytes,{headers});
}
