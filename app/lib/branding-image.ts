import sharp from 'sharp';
export async function normalizeBrandingImage(input:Uint8Array,mime:string,limits={bytes:5242880,pixels:16777216}){
 if(!input.byteLength||input.byteLength>limits.bytes)throw new Error('Image size limit');
 const detected=[137,80,78,71,13,10,26,10].every((value,index)=>input[index]===value)?'image/png':input[0]===255&&input[1]===216&&input[2]===255?'image/jpeg':String.fromCharCode(...input.subarray(0,4))==='RIFF'&&String.fromCharCode(...input.subarray(8,12))==='WEBP'?'image/webp':null;
 if(!detected||detected!==mime)throw new Error('Invalid raster format');
 const image=sharp(input,{limitInputPixels:limits.pixels,failOn:'warning'}),metadata=await image.metadata();
 if(!['png','jpeg','webp'].includes(metadata.format||'')||(metadata.pages||1)>1)throw new Error('Static raster required');
 const output=await image.rotate().resize(4096,4096,{fit:'inside',withoutEnlargement:true}).png({compressionLevel:9}).toBuffer();
 if(output.byteLength>5242880)throw new Error('Output size limit');
 return output;
}
