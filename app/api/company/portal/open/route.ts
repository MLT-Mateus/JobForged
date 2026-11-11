import type {NextRequest} from 'next/server';
import {readSession,requestDatabase} from '@/app/api/auth/_server';
import {validPortalSlug} from '@/app/lib/company-portal';
import {companyPageHref,type CompanyDomain} from '@/app/lib/company-domain';

export const runtime='nodejs';
/** Resolve on every click so a disconnected or expired domain is never cached in the editor. */
export async function GET(request:NextRequest){
 const headers=new Headers({'Cache-Control':'private, no-store',Vary:'Cookie'});
 const session=await readSession(request,headers);
 if(!session?.company||session.platformAdmin)return Response.json({message:'Acesso negado.'},{status:403,headers});
 const portalResponse=await requestDatabase('rpc/read_company_portal',session.accessToken,{}).catch(()=>null);
 if(!portalResponse?.ok)return Response.json({message:'Não foi possível abrir a página. Tente novamente.'},{status:503,headers});
 const portal=await portalResponse.json() as {slug:string;isPublic:boolean};
 if(!validPortalSlug(portal.slug))return Response.json({message:'Endereço indisponível.'},{status:503,headers});
 const domainResponse=await requestDatabase('rpc/company_domain',session.accessToken,{operation:'read'}).catch(()=>null);
 const domain=domainResponse?.ok?await domainResponse.json() as CompanyDomain:null;
 const job=new URL(request.url).searchParams.get('job');
 headers.set('Location',companyPageHref(portal.slug,portal.isPublic?domain:null)+(job&&/^[0-9a-f-]{36}$/i.test(job)?'#vaga-'+job:''));
 return new Response(null,{status:302,headers});
}
