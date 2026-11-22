import type {NextRequest} from 'next/server';
import {readSession,requestDatabase} from '@/app/api/auth/_server';
export const runtime='nodejs';
export async function GET(request:NextRequest){
 const headers=new Headers({'Cache-Control':'private, no-store',Vary:'Cookie','X-Content-Type-Options':'nosniff'}),session=await readSession(request,headers);
 if(!session?.platformAdmin)return new Response(null,{status:403,headers});
 const id=request.nextUrl.searchParams.get('member');if(!id||!/^[0-9a-f-]{36}$/i.test(id))return new Response(null,{status:400,headers});
 const response=await requestDatabase('rpc/platform_member_photo',session.accessToken,{member_id:id});
 if(!response?.ok)return new Response(null,{status:403,headers});const photo=await response.json();if(typeof photo!=='string')return new Response(null,{status:404,headers});
 headers.set('Content-Type','image/webp');return new Response(Buffer.from(photo,'base64'),{headers});
}
