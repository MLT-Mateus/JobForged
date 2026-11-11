import type {NextRequest} from 'next/server';
import {readSession,requestDatabase,requireSameOrigin} from '@/app/api/auth/_server';
import {readImageUpload} from '@/app/lib/image-upload-request';
import {normalizeMemberPhoto} from '@/app/lib/member-photo';
export const runtime='nodejs';
export async function GET(request:NextRequest){
 const headers=new Headers({'Cache-Control':'private, no-store',Vary:'Cookie','X-Content-Type-Options':'nosniff'}),session=await readSession(request,headers);
 if(!session?.company||session.platformAdmin)return new Response(null,{status:403,headers});
 const params=new URL(request.url).searchParams,id=params.get('member');
 if(!id||!/^[0-9a-f-]{36}$/i.test(id))return new Response(null,{status:400,headers});
 const response=await requestDatabase('rpc/member_photo_read_v1',session.accessToken,{member_id:id,small:params.get('size')!=='profile'});
 if(!response?.ok)return new Response(null,{status:404,headers});
 const photo=await response.json();if(typeof photo!=='string')return new Response(null,{status:404,headers});
 headers.set('Content-Type','image/webp');return new Response(Buffer.from(photo,'base64'),{headers});
}
async function write(request:NextRequest,remove=false){
 if(!requireSameOrigin(request))return Response.json({message:'Origem inválida.'},{status:403});
 const headers=new Headers({'Cache-Control':'private, no-store'}),session=await readSession(request,headers);
 if(!session?.company||session.platformAdmin)return Response.json({message:'Acesso negado.'},{status:403,headers});
 try{
  const image=remove?null:await readImageUpload(request,2097152);
  const normalized=image?await normalizeMemberPhoto(image.input,image.mime):null;
  const response=await requestDatabase('rpc/member_photo_write_v1',session.accessToken,{photo:normalized?.photo??null,thumbnail:normalized?.thumbnail??null});
  if(!response?.ok)return Response.json({message:'Não foi possível salvar a foto. Tente novamente.'},{status:400,headers});
  return Response.json(await response.json(),{headers});
 }catch{return Response.json({message:'Use PNG, JPEG, WebP ou AVIF estático, até 2 MB e 16 milhões de pixels.'},{status:400,headers})}
}
export const POST=(request:NextRequest)=>write(request);
export const DELETE=(request:NextRequest)=>write(request,true);
