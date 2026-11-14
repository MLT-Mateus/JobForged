import type {NextRequest} from 'next/server';
import {getSupabaseConfig,requestDatabase} from '@/app/api/auth/_server';
export async function GET(request:NextRequest){
 const config=getSupabaseConfig();
 const headers={'Cache-Control':'no-store'};
 if(!config)return Response.json([],{headers});
 try{
  const url=new URL(request.nextUrl.searchParams.get('url')||'');
  if(url.protocol!=='https:')return Response.json([],{headers});
  const response=await requestDatabase('rpc/tracking_for_page',config.anonKey,{page_url:url.origin+url.pathname});
  return Response.json(response?.ok?await response.json():[],{headers});
 }catch{return Response.json([],{headers});}
}
