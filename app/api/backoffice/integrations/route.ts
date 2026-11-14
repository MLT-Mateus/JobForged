import type {NextRequest} from 'next/server';
import {communicationsSession,communicationJson,communicationRpc} from '@/app/lib/communications-server';
export async function GET(request:NextRequest){
 const {headers,session}=await communicationsSession(request,true);
 if(!session)return Response.json({message:'Acesso negado.'},{status:403,headers});
 return communicationRpc(session.accessToken,'tracking_manage',{operation:'list'},headers);
}
export async function POST(request:NextRequest){
 const {headers,session}=await communicationsSession(request,true,true);
 if(!session)return Response.json({message:'Acesso negado.'},{status:403,headers});
 try{
  const body=await communicationJson(request);
  if(!['save','delete'].includes(String(body.operation)))throw new Error();
  if(body.id!==null&&body.id!==undefined&&!/^[0-9a-f-]{36}$/i.test(String(body.id)))throw new Error();
  const values=body.values as {name:string;tag_id:string;urls:string[];enabled:boolean};
  if(body.operation==='save'){
   if(!values||typeof values.name!=='string'||!values.name.trim()||values.name.length>100||!/^AW-[0-9]{6,20}$/.test(values.tag_id)||typeof values.enabled!=='boolean'||!Array.isArray(values.urls)||!values.urls.length||values.urls.length>100)throw new Error();
   for(const address of values.urls){const url=new URL(address);if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||address.length>500||address.includes('*')&&!address.endsWith('/*'))throw new Error();}
  }
  return communicationRpc(session.accessToken,'tracking_manage',{operation:body.operation,record_id:body.id??null,values_json:values??{}},headers);
 }catch{return Response.json({message:'Confira o nome, ID AW- e URLs HTTPS. Use uma URL por linha, com /* ao final para incluir subpáginas.'},{status:400,headers});}
}
