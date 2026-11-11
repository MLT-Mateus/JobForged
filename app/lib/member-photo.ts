import sharp from 'sharp';
import {normalizeBrandingImage} from './branding-image.ts';
export async function normalizeMemberPhoto(input:Uint8Array,mime:string){
 if(!['image/png','image/jpeg','image/webp','image/avif'].includes(mime))throw Error('Formato inválido');
 const clean=await normalizeBrandingImage(input,mime,{bytes:2097152,pixels:16777216});
 const render=(size:number)=>sharp(clean).resize(size,size,{fit:'cover',position:'attention'}).webp({quality:78,effort:4}).toBuffer();
 const [photo,thumbnail]=await Promise.all([render(256),render(64)]);
 if(photo.length>65536||thumbnail.length>16384)throw Error('Imagem muito complexa');
 return {photo:Buffer.from(photo).toString('base64'),thumbnail:Buffer.from(thumbnail).toString('base64')};
}
