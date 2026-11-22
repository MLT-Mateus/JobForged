import sharp from 'sharp';
import {staticSvg} from './static-svg.ts';
export async function normalizeBrandingImage(input:Uint8Array,mime:string,limits={bytes:5242880,pixels:16777216}){
 if(!input.byteLength||input.byteLength>limits.bytes)throw new Error('Image size limit');
 const bytes=Buffer.from(input),avif=bytes.toString('ascii',4,8)==='ftyp'&&bytes.readUInt32BE(0)<=Math.min(bytes.length,4096)&&bytes.subarray(8,bytes.readUInt32BE(0)).includes(Buffer.from('avif'))&&!bytes.subarray(8,bytes.readUInt32BE(0)).includes(Buffer.from('avis'));
 const detected=mime==='image/svg+xml'?'image/svg+xml':[137,80,78,71,13,10,26,10].every((value,index)=>input[index]===value)?'image/png':input[0]===255&&input[1]===216&&input[2]===255?'image/jpeg':String.fromCharCode(...input.subarray(0,4))==='RIFF'&&String.fromCharCode(...input.subarray(8,12))==='WEBP'?'image/webp':avif?'image/avif':null;
 if(!detected||detected!==mime)throw new Error('Invalid raster format');
 const image=sharp(detected==='image/svg+xml'?staticSvg(input):input,{limitInputPixels:limits.pixels,failOn:'warning'}).timeout({seconds:8}),metadata=await image.metadata();
 if(!['png','jpeg','webp','svg','heif'].includes(metadata.format||'')||(metadata.format==='heif'&&metadata.compression!=='av1')||(metadata.pages||1)>1)throw new Error('Static raster required');
 const output=await image.rotate().resize(4096,4096,{fit:'inside',withoutEnlargement:true}).png({compressionLevel:9}).toBuffer();
 if(output.byteLength>5242880)throw new Error('Output size limit');
 return output;
}

/** A small square rendition; never crops or overwrites the source asset. */
export async function squareBrandingIcon(input:Uint8Array){const image=sharp(input,{limitInputPixels:16777216,failOn:'warning'}).timeout({seconds:3});const meta=await image.metadata();if(!meta.width||meta.width!==meta.height)throw Error('Square icon required');return image.resize(64,64).png().toBuffer()}
