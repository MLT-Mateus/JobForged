import type {NextRequest} from 'next/server';
import {requestDatabase} from '@/app/api/auth/_server';
import {communicationsSession,communicationJson} from '@/app/lib/communications-server';
import {sendPlatformCommunicationEmail} from '@/app/lib/platform-communication-email';
export const runtime='nodejs';
export async function POST(request:NextRequest){
 const {headers,session}=await communicationsSession(request,true,true);if(!session)return Response.json({message:'Acesso negado.'},{status:403,headers});
 if(!process.env.BREVO_API_KEY?.trim())return Response.json({message:'O provedor de e-mail não está configurado. Nenhum destinatário foi processado.'},{status:503,headers});
 try{const b=await communicationJson(request);if(typeof b.id!=='string'||!/^[0-9a-f-]{36}$/i.test(b.id))throw new Error();
 let processed=0,accepted=0,attention=0;
 // Small, explicit batches. A claimed attempt is never retried automatically.
 for(let i=0;i<5;i++){
 const claim=await requestDatabase('rpc/claim_communication_email',session.accessToken,{campaign_id:b.id});if(!claim?.ok)throw new Error();
 const item=await claim.json() as {id?:string;attempt:string;email:string;title:string;message:string;link:string};if(!item.id)break;
 const outcome=await sendPlatformCommunicationEmail(item);processed++;if(outcome==='sent')accepted++;else attention++;
 const finish=await requestDatabase('rpc/finish_communication_email',session.accessToken,{delivery_id:item.id,attempt:item.attempt,outcome});
 if(!finish?.ok)return Response.json({message:'O resultado do envio não pôde ser confirmado. O registro exige conferência; não reenvie automaticamente.'},{status:503,headers});
 }
 return Response.json({processed,accepted,attention},{headers});
 }catch{return Response.json({message:'Não foi possível concluir o lote. Atualize os resultados antes de continuar.'},{status:503,headers})}
}
