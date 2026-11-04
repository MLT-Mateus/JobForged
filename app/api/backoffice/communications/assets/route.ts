import type { NextRequest } from 'next/server';
import {readImageUpload} from '@/app/lib/image-upload-request';
import {imageFormats} from '@/shared/image-upload';
import { createHash, randomUUID } from 'node:crypto';
import { normalizeBrandingImage } from '@/app/lib/branding-image';
import { readSession, requestDatabase, requireSameOrigin } from '@/app/api/auth/_server';
import { brandingStorage } from '@/app/api/company/branding/_storage';
export const runtime='nodejs';
export async function POST(request:NextRequest){
 if(!requireSameOrigin(request))return Response.json({message:'Origem inválida.'},{status:403});
 const headers=new Headers({'Cache-Control':'no-store'}),session=await readSession(request,headers);
 if(!session?.platformAdmin)return Response.json({message:'Acesso negado.'},{status:403,headers});
 const permitted=await requestDatabase('rpc/begin_platform_image_upload',session.accessToken,{});
 if(!permitted?.ok)return Response.json({message:permitted?.status===429?'Limite temporário atingido. Tente novamente mais tarde.':'Confirme sua autenticação na seção Segurança antes de enviar a imagem.'},{status:permitted?.status===429?429:403,headers});
 try{
  const file=await readImageUpload(request,10485760);
  // Input up to 10 MiB / 32 MP; processed PNG stays under the private bucket's 5 MiB limit.
  const output=await normalizeBrandingImage(file.input,file.mime,{bytes:10485760,pixels:33554432});
  const id=randomUUID(),path=`platform/${id}.png`;
  const uploaded=await brandingStorage(path,session.accessToken,output);
  if(!uploaded?.ok)return Response.json({message:'O armazenamento de imagens está indisponível. Tente novamente.'},{status:503,headers});
  const name=file.name.replace(/[^\p{L}\p{N} ._-]/gu,'').slice(0,240)||'imagem.png';
  const registered=await requestDatabase('rpc/register_platform_banner_asset',session.accessToken,{asset_id:id,file_size:output.byteLength,file_sha256:createHash('sha256').update(output).digest('hex')});
  if(!registered?.ok)return Response.json({message:'Não foi possível registrar a imagem. Tente novamente.'},{status:503,headers});
  return Response.json({asset:{id,kind:file.kind.slice(0,40),name,url:`/api/communications/assets/${id}`,format:'PNG',size:output.byteLength,updatedAt:new Date().toISOString()}},{headers});
 }catch(error){if(error instanceof Error&&error.message==='Output size limit')return Response.json({message:'A imagem otimizada ainda excede 5 MB. Reduza suas dimensões ou complexidade antes de enviar.'},{status:413,headers});return Response.json({message:error instanceof Error&&error.message.startsWith('Use um SVG')?error.message:error instanceof Error&&error.message==='Image size limit'?'Envie uma imagem de até 10 MB.':`Use ${imageFormats}, até 10 MB e 32 milhões de pixels. Imagens animadas não são aceitas.`},{status:error instanceof Error&&error.message==='Image size limit'?413:400,headers})}
}
