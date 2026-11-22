import sharp from 'sharp';
import {createHash} from 'node:crypto';
const MAX_CACHE=32*1024*1024,MAX_ENTRIES=64,TTL=10*60*1000;
type Result={bytes:Buffer<ArrayBuffer>;type:'image/png'|'image/webp'};
const cache=new Map<string,{at:number;value:Result}>(),pending=new Map<string,Promise<Result>>();let retained=0;
export function acceptsWebp(accept:string|null){return (accept||'').split(',').some(part=>{const [type,...params]=part.trim().toLowerCase().split(';');const q=params.find(p=>p.trim().startsWith('q='));return type==='image/webp'&&(!q||Number(q.trim().slice(2))>0)})}
/** Called only AFTER asset authorization and integrity checks. Originals/Storage stay immutable. */
export async function webImage(input:Uint8Array,accept:string|null):Promise<Result>{
 const original:Result={bytes:Buffer.from(input),type:'image/png'};
 if(!acceptsWebp(accept)||input.length<1024||input.length>5242880)return original;
 const key=createHash('sha256').update(input).digest('hex');const hit=cache.get(key);
 if(hit&&Date.now()-hit.at<TTL){cache.delete(key);cache.set(key,hit);return hit.value}
 if(hit){retained-=hit.value.bytes.length;cache.delete(key)}
 if(pending.has(key))return pending.get(key)!;
 // A bounded, best-effort optimization: saturation never blocks image delivery.
 if(pending.size>=2)return original;
 const work=(async()=>{try{
  const image=sharp(input,{limitInputPixels:16777216,failOn:'warning'}).timeout({seconds:3});const meta=await image.metadata();
  if(meta.format!=='png'||(meta.pages||1)>1)return original;
  const bytes=await image.resize(2560,2560,{fit:'inside',withoutEnlargement:true}).webp({quality:86,alphaQuality:100,effort:4,lossless:Math.max(meta.width||0,meta.height||0)<=512}).toBuffer();
  const value:Result=bytes.length<input.length?{bytes,type:'image/webp'}:original;
  while(cache.size&&(retained+value.bytes.length>MAX_CACHE||cache.size>=MAX_ENTRIES)){const first=cache.keys().next().value!;retained-=cache.get(first)!.value.bytes.length;cache.delete(first)}
  cache.set(key,{at:Date.now(),value});retained+=value.bytes.length;return value;
 }catch{return original}finally{pending.delete(key)}})();pending.set(key,work);return work;
}
export async function optimizedImageResponse(bytes:Uint8Array,headers:Headers,accept:string|null){
 const result=await webImage(bytes,accept);headers.set('Content-Type',result.type);
 const vary=new Set((headers.get('Vary')||'').split(',').map(s=>s.trim()).filter(Boolean));vary.add('Accept');headers.set('Vary',[...vary].join(', '));
 return new Response(result.bytes,{headers});
}
