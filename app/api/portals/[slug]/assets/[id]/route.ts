import type {NextRequest} from 'next/server';
import {createHash} from 'node:crypto';
import {getSupabaseConfig,requestDatabase} from '@/app/api/auth/_server';
import {brandingStorage} from '@/app/api/company/branding/_storage';
import {validPortalSlug} from '@/app/lib/company-portal';
export const runtime='nodejs';
export async function GET(_request:NextRequest,{params}:{params:Promise<{slug:string;id:string}>}){
 const {slug,id}=await params;const headers=new Headers({'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"});
 if(!validPortalSlug(slug)||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id))return new Response(null,{status:404,headers});
 const config=getSupabaseConfig();if(!config)return new Response(null,{status:503,headers});
 const response=await requestDatabase('rpc/read_public_portal_asset',config.anonKey,{requested_slug:slug,asset_id:id}).catch(()=>null);if(!response?.ok)return new Response(null,{status:503,headers});
 const asset=await response.json() as {path:string;size:number;sha256:string}|null;if(!asset)return new Response(null,{status:404,headers});if(!Number.isSafeInteger(asset.size)||asset.size<8||asset.size>5242880||!asset.path.endsWith('/'+id+'.png')||!/^([a-f0-9-]{36})\/([a-f0-9-]{36})\.png$/.test(asset.path))return new Response(null,{status:503,headers});
 const stored=await brandingStorage(asset.path,config.anonKey);if(!stored?.ok)return new Response(null,{status:503,headers});const bytes=Buffer.from(await stored.arrayBuffer());
 if(bytes.length<8||!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||bytes.length!==asset.size||createHash('sha256').update(bytes).digest('hex')!==asset.sha256)return new Response(null,{status:503,headers});
 headers.set('Content-Type','image/png');return new Response(bytes,{headers});
}
