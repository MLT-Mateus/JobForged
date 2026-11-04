import type { NextRequest } from 'next/server';
import sharp from 'sharp';
import {readImageUpload} from '@/app/lib/image-upload-request';
import {imageFormats} from '@/shared/image-upload';
import { createHash, randomUUID } from 'node:crypto';
import { normalizeBrandingImage } from '@/app/lib/branding-image';
import { readSession, requestDatabase, requireSameOrigin } from '@/app/api/auth/_server';
import { brandingStorage } from '../_storage';
export const runtime='nodejs';
export async function POST(request:NextRequest){
 if(!requireSameOrigin(request))return Response.json({message:'Origem inválida.'},{status:403});
 const headers=new Headers({'Cache-Control':'no-store'}),session=await readSession(request,headers);
 if(!session?.company||session.platformAdmin||!['owner','admin'].includes(session.role))return Response.json({message:'Acesso negado.'},{status:403,headers});
 try{
  const file=await readImageUpload(request,5242880);
  if(file.companyId!==session.company.id)return Response.json({message:'O contexto da conta mudou. Recarregue a identidade antes de enviar imagens.'},{status:409,headers});
  if(['logoMain','logoDark','favicon','avatar'].includes(file.kind)&&file.input.byteLength>2097152)return Response.json({message:'Envie esta imagem de marca com até 2 MB.'},{status:413,headers});
  const id=randomUUID(),path=`${session.company.id}/${id}.png`;
  const reservation=await requestDatabase('rpc/reserve_company_image',session.accessToken,{asset_id:id});
  if(!reservation?.ok){
   const error=await reservation?.json().catch(()=>null) as {code?:string}|null;
   const limited=['54000','53300'].includes(error?.code||'');
   return Response.json({message:limited?'Limite de imagens ou de envios atingido. Aguarde e tente novamente.':'Não foi possível autorizar o envio.'},{status:limited?429:503,headers});
  }
  const output=await normalizeBrandingImage(file.input,file.mime);
  if(file.kind==='panoramaImage'){const m=await sharp(output).metadata();const ratio=(m.width||0)/(m.height||1);if(ratio<2.85||ratio>3.15)return Response.json({message:'O banner panorâmico precisa da proporção 3:1. Exemplo: 2400 × 800 px.'},{status:400,headers})}
  const uploaded=await brandingStorage(path,session.accessToken,output);
  if(!uploaded?.ok)return Response.json({message:'O armazenamento de imagens está indisponível. Tente novamente.'},{status:503,headers});
  const name=file.name.replace(/[^\p{L}\p{N} ._-]/gu,'').slice(0,240)||'imagem.png';
  const registered=await requestDatabase('rpc/register_company_brand_asset',session.accessToken,{asset_id:id,file_name:name,file_size:output.byteLength,file_sha256:createHash('sha256').update(output).digest('hex')});
  if(!registered?.ok)return Response.json({message:'Não foi possível registrar a imagem. Tente novamente.'},{status:503,headers});
  return Response.json({asset:{id,kind:file.kind.slice(0,40),name,url:`/api/company/branding/assets/${id}`,format:'PNG',size:output.byteLength,updatedAt:new Date().toISOString()}},{headers});
 }catch(error){const message=error instanceof Error?error.message:'';return Response.json({message:message.startsWith('Use um SVG')?message:message==='Image size limit'?'Envie uma imagem de até 5 MB.':message==='Output size limit'?'A imagem convertida excede 5 MB. Reduza suas dimensões.':`Use ${imageFormats}, até 5 MB e 16 milhões de pixels. Imagens animadas não são aceitas.`},{status:['Image size limit','Output size limit'].includes(message)?413:400,headers})}
}
