import type {NextRequest} from 'next/server';
import {readSession,requestDatabase,requireSameOrigin} from '@/app/api/auth/_server';
import {normalizeBrandingRichContent,validateBranding} from '@/app/components/personalization/branding-model';
import {validPortalSlug} from '@/app/lib/company-portal';
export const runtime='nodejs';
export async function GET(request:NextRequest){const headers=new Headers({'Cache-Control':'no-store',Vary:'Cookie'}),session=await readSession(request,headers);if(!session?.company||session.platformAdmin)return Response.json({message:'Acesso negado.'},{status:403,headers});const result=await requestDatabase('rpc/read_company_portal',session.accessToken,{}).catch(()=>null);if(!result?.ok)return Response.json({message:'Não foi possível carregar o endereço.'},{status:503,headers});return Response.json(await result.json(),{headers})}
export async function POST(request:NextRequest){
 if(!requireSameOrigin(request))return Response.json({message:'Origem inválida.'},{status:403});
 const headers=new Headers({'Cache-Control':'no-store',Vary:'Cookie'}),session=await readSession(request,headers);
 if(!session?.company||session.platformAdmin||!['owner','admin'].includes(session.role))return Response.json({message:'Acesso negado.'},{status:403,headers});
 const reader=request.body?.getReader();let text='',bytes=0;const decoder=new TextDecoder();if(reader){while(true){const item=await reader.read();if(item.done)break;bytes+=item.value.byteLength;if(bytes>131072){await reader.cancel();return Response.json({message:'Conteúdo muito grande.'},{status:413,headers})}text+=decoder.decode(item.value,{stream:true})}text+=decoder.decode()}
 let body:{operation?:string;companyId?:string;version?:number;slug?:string;brandingVersion?:number;configuration?:unknown};try{body=JSON.parse(text)}catch{return Response.json({message:'Dados inválidos.'},{status:400,headers})}
 if(!body||!['address','publish','unpublish'].includes(body.operation||'')||!Number.isSafeInteger(body.version)||Number(body.version)<0)return Response.json({message:'Operação inválida.'},{status:400,headers});
 if(body.companyId!==session.company.id)return Response.json({message:'A empresa ativa mudou. Recarregue antes de continuar.'},{status:409,headers});
 const configuration=normalizeBrandingRichContent(body.configuration);
 if(body.operation==='address'&&!validPortalSlug(body.slug))return Response.json({message:'Use de 3 a 63 letras minúsculas, números e hífens. Este endereço não pode ser reservado.'},{status:400,headers});
 if(body.operation==='publish'){if(!Number.isSafeInteger(body.brandingVersion)||Number(body.brandingVersion)<0)return Response.json({message:'Versão inválida.'},{status:400,headers});const error=validateBranding(configuration);if(error)return Response.json({message:error},{status:400,headers})}
 const result=await requestDatabase('rpc/write_company_portal',session.accessToken,{operation:body.operation,expected_version:body.version,requested_slug:body.slug||null,branding_version:body.brandingVersion??null,configuration:configuration??null}).catch(()=>null);
 if(!result)return Response.json({message:'Serviço indisponível. Tente novamente em instantes.'},{status:503,headers});
 if(!result.ok){const error=await result?.json().catch(()=>null) as {code?:string}|null;const code=error?.code;const status=code==='40001'||code==='23505'?409:code==='42501'?403:code==='PT429'?429:400;return Response.json({message:code==='23505'?'Este endereço não está disponível.':code==='40001'?'Outra sessão alterou a página. Recarregue antes de salvar; seus campos foram preservados.':status===429?'Limite temporário atingido. Tente novamente em instantes.':'Não foi possível concluir. Confira os campos e sua permissão.'},{status,headers})}
 return Response.json(await result.json(),{headers});
}
