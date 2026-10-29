import type { NextRequest } from 'next/server';
import { readSession, requestDatabase, requireSameOrigin } from '@/app/api/auth/_server';
import { brandContent, brandingDefaults, isDefaultBranding, validateBranding, normalizeBrandingRichContent } from '@/app/components/personalization/branding-model';
export const runtime='nodejs';
export async function GET(request:NextRequest){
 const headers=new Headers({'Cache-Control':'no-store',Vary:'Cookie'}),session=await readSession(request,headers);
 if(!session?.company||session.platformAdmin)return Response.json({message:'Acesso negado.'},{status:403,headers});
 const response=await requestDatabase('rpc/read_company_branding',session.accessToken,{}).catch(()=>null);
 if(!response?.ok)return Response.json({message:'Não foi possível carregar a identidade.'},{status:503,headers});
 const data=await response.json();return Response.json(data,{headers});
}
export async function POST(request:NextRequest){
 if(!requireSameOrigin(request))return Response.json({message:'Origem inválida.'},{status:403});
 const headers=new Headers({'Cache-Control':'no-store'}),session=await readSession(request,headers);
 if(!session?.company||session.platformAdmin||!['owner','admin'].includes(session.role))return Response.json({message:'Acesso negado.'},{status:403,headers});
 // Bound the actual stream, not only the untrusted Content-Length header.
 const reader=request.body?.getReader();let bytes=0,text='';const decoder=new TextDecoder();
 if(reader){while(true){const chunk=await reader.read();if(chunk.done)break;bytes+=chunk.value.byteLength;if(bytes>131072){await reader.cancel();return Response.json({message:'A configuração excede o limite.'},{status:413,headers})}text+=decoder.decode(chunk.value,{stream:true})}text+=decoder.decode()}
 let body:{operation?:string;version?:number;companyId?:string;configuration?:unknown;historyId?:string};
 try{body=JSON.parse(text)}catch{return Response.json({message:'Configuração inválida.'},{status:400,headers})}
 if(body?.companyId!==session.company.id)return Response.json({message:'O contexto da conta mudou. Recarregue os dados antes de continuar; seus campos foram preservados.',conflict:true},{status:409,headers});
 if(!body||!['save','publish','reset','discard','restore'].includes(body.operation||'')||!Number.isSafeInteger(body.version)||Number(body.version)<0||
  (body.operation==='restore'&&!/^[0-9a-f-]{36}$/i.test(body.historyId||'')))return Response.json({message:'Operação inválida.'},{status:400,headers});
 const configuration=body.operation==='reset'?brandContent(brandingDefaults(session.company.id,session.company.name)):normalizeBrandingRichContent(body.configuration);
 if(['save','publish','reset'].includes(body.operation||'')){const error=validateBranding(configuration);if(error)return Response.json({message:error},{status:400,headers})}
 if(body.operation==='reset'){
  const current=await requestDatabase('rpc/read_company_branding',session.accessToken,{}).catch(()=>null);if(!current?.ok)return Response.json({message:'Não foi possível conferir o padrão atual.'},{status:503,headers});
  const row=await current.json() as {version:number;companyName:string;draft:object|null};if(row.version!==body.version)return Response.json({message:'Outra sessão alterou a identidade. Recarregue antes de restaurar.',conflict:true},{status:409,headers});
  if(isDefaultBranding({...brandingDefaults(session.company.id,row.companyName),...row.draft},row.companyName))return Response.json({version:row.version,message:'A personalização já está no padrão.'},{headers});
 }
 const result=await requestDatabase('rpc/write_company_branding',session.accessToken,{operation:body.operation,expected_version:body.version,configuration:configuration||null,history_id:body.historyId||null}).catch(()=>null);
 if(!result?.ok){const error=await result?.json().catch(()=>null) as {code?:string}|null;const conflict=error?.code==='40001';return Response.json({message:conflict?'Outra sessão alterou esta identidade. Recarregue os dados antes de salvar; seus campos foram preservados.':'Revise os campos, URLs, imagens e contraste da identidade.',conflict},{status:conflict?409:400,headers})}
 return Response.json({version:await result.json()},{headers});
}
