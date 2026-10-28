import {readSession,requestDatabase,requireSameOrigin} from '@/app/api/auth/_server';
import type {NextRequest} from 'next/server';
import {administrativeFailure} from './administrative-feedback';
export async function communicationsSession(request:NextRequest,admin=false,mutation=false){
 const headers=new Headers({'Cache-Control':'private, no-store',Vary:'Cookie'});
 if(mutation&&!requireSameOrigin(request))return {headers,session:null};
 const session=await readSession(request,headers);
 return {headers,session:session&&(admin?session.platformAdmin:session.platformAdmin||session.company)?session:null};
}
export async function communicationJson(request:NextRequest){
 const reader=request.body?.getReader();if(!reader)throw new Error();let size=0;const chunks:Uint8Array[]=[];
 while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>16000){await reader.cancel();throw new Error()}chunks.push(part.value)}
 return JSON.parse(new TextDecoder().decode(Buffer.concat(chunks))) as Record<string,unknown>;
}
export async function communicationRpc(token:string,path:string,body:unknown,headers:Headers){
 const response=await requestDatabase('rpc/'+path,token,body).catch(()=>null);
 if(!response?.ok){const error=await response?.clone().json().catch(()=>null) as {code?:string}|null;if(error?.code==='40001')return Response.json({message:'Outra sessão alterou este registro. Recarregue antes de salvar.'},{status:409,headers});return administrativeFailure(response,'Operação recusada. Confira as permissões, os campos e os destinatários.',headers)}
 return Response.json(await response.json(),{headers});
}
