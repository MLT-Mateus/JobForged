import {readFile,writeFile} from 'node:fs/promises';
import sharp from 'sharp';

// Derive the search/browser assets from the existing approved symbol.
const source=await readFile(new URL('../public/brand/jobforged-symbol.svg',import.meta.url));
const png=size=>sharp(source,{density:384}).resize(size,size).png().toBuffer();
await writeFile(new URL('../public/favicon-96x96.png',import.meta.url),await png(96));
await writeFile(new URL('../public/apple-touch-icon.png',import.meta.url),await png(180));
const sizes=[16,32,48],frames=await Promise.all(sizes.map(png));
const header=Buffer.alloc(6+16*frames.length);header.writeUInt16LE(1,2);header.writeUInt16LE(frames.length,4);
let offset=header.length;
frames.forEach((frame,index)=>{
 const at=6+16*index;header[at]=sizes[index];header[at+1]=sizes[index];header.writeUInt16LE(1,at+4);header.writeUInt16LE(32,at+6);header.writeUInt32LE(frame.length,at+8);header.writeUInt32LE(offset,at+12);offset+=frame.length;
});
await writeFile(new URL('../public/favicon.ico',import.meta.url),Buffer.concat([header,...frames]));
