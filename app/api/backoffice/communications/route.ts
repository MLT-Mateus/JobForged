import type {NextRequest} from 'next/server';
import {communicationsSession,communicationJson,communicationRpc} from '@/app/lib/communications-server';
export const runtime='nodejs';
export async function GET(request:NextRequest){const {headers,session}=await communicationsSession(request,true);if(!session)return Response.json({message:'Acesso negado.'},{status:403,headers});return communicationRpc(session.accessToken,'communications_read',{section:'manage'},headers)}
export async function POST(request:NextRequest){const {headers,session}=await communicationsSession(request,true,true);if(!session)return Response.json({message:'Acesso negado.'},{status:403,headers});try{
 const b=await communicationJson(request);if(!['banner.save','campaign.save','campaign.dispatch'].includes(String(b.operation))||(b.id!==null&&b.id!==undefined&&(typeof b.id!=='string'||!/^[0-9a-f-]{36}$/i.test(b.id)))||!Number.isInteger(b.version)||Number(b.version)<0||!b.values||typeof b.values!=='object'||Array.isArray(b.values))throw new Error();
 const v=b.values as Record<string,unknown>;if(Object.values(v).some(x=>!['string','boolean','number'].includes(typeof x)))throw new Error();
 if(v.link){const u=new URL(String(v.link));if(u.protocol!=='https:'||u.username||u.password)throw new Error()}
 return communicationRpc(session.accessToken,'communications_manage',{operation:b.operation,record_id:b.id||null,expected_version:b.version,values_json:v},headers);
 }catch{return Response.json({message:'Revise os campos e use links HTTPS completos.'},{status:400,headers})}}
