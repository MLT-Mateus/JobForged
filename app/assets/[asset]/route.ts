import {retainedAsset} from '@/shared/retained-assets.mjs';
export const runtime='nodejs';
export async function GET(_request:Request,{params}:{params:Promise<{asset:string}>}){
 const {asset}=await params;const file=await retainedAsset(process.env.JBFD_RETAINED_ASSETS_DIR,asset);
 if(!file)return new Response('Arquivo não encontrado.',{status:404,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 return new Response(file.bytes,{headers:{'Content-Type':file.mime,'Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff','X-JBFD-Asset-Source':'retained'}});
}
