// Offline artwork. Coordinates use the 800px inspection width for each original.
import sharp from 'sharp';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const root=new URL('../public/careers/',import.meta.url);
const output=new URL('masks/',root);
const artwork=[
 {
  name:'team-jobforged-v2',height:533,
  primary:{
   fabric:[
    'M255 117 Q281 96 323 96 L331 131 Q336 151 353 164 L370 189 Q391 161 411 122 L425 102 Q453 110 467 134 Q478 153 476 199 L484 281 Q486 293 479 309 L475 309 Q473 284 446 290 L430 296 L426 310 L307 311 L305 292 Q292 281 276 288 L271 258 L253 248 Q271 224 275 199 L280 174 Q277 146 255 117Z',
   ],
   scenery:[
    'M751 259 Q768 256 800 259 V415 L783 414 Q781 381 775 359 L765 357 Q762 336 749 318 Q742 299 745 274Z',
   ],
  },
  secondary:{
   fabric:[
    'M501 266 Q512 244 542 242 L568 253 L616 246 L683 240 Q718 243 729 271 L747 311 L766 353 Q778 377 781 400 L781 417 L770 420 H718 L700 402 L686 389 L645 393 L601 399 L570 389 L545 386 Q524 370 511 384 Q503 391 506 405 L513 414 H488 L498 376 L509 319 Q502 293 501 266Z',
   ],
   scenery:[
    'M459 0 H666 L668 216 L641 238 L547 252 L502 261 L499 312 H469 L460 286Z',
   ],
  },
 },
 {
  name:'team-jobforged-panorama-v1',height:267,
  primary:{
   fabric:[
    'M168 65 Q182 54 204 50 L210 73 Q216 87 225 96 Q243 79 249 65 L254 51 Q276 57 279 72 L285 141 Q285 156 278 163 Q278 145 255 153 L251 163 H193 Q190 147 176 149 L169 145 L165 132 Q174 117 176 103 Q177 84 168 65Z',
   ],
   scenery:[
    'M664 151 Q680 144 681 133 L800 132 V159 L758 158 L757 155 L698 155 L698 170 L665 170Z',
    'M767 158 Q780 151 800 156 V190 L766 188Z',
   ],
  },
  secondary:{
   fabric:[
    'M292 142 Q301 126 320 121 L352 123 L383 121 Q399 127 410 146 L423 172 Q433 194 434 215 L429 218 H400 L393 204 L367 205 L343 211 L325 201 Q305 190 297 201 L296 213 L282 215 L288 185Z',
   ],
   scenery:[
    'M275 0 H391 L392 111 L372 128 L308 146 L279 150 L273 93Z',
   ],
  },
 },
 {
  name:'culture-jobforged-v1',height:267,
  primary:{
   fabric:[
    'M141 112 Q157 88 183 79 L199 91 L208 91 Q215 85 218 77 Q236 83 244 100 Q250 125 255 148 L250 171 L242 176 L246 205 L249 239 L236 246 L227 244 L231 251 Q202 257 174 249 L162 244 L155 233 L157 192 L155 183 L139 177 Q136 157 141 112Z',
    'M675 124 Q680 115 687 111 L693 103 Q700 110 710 113 L728 123 L741 123 Q752 141 749 164 L748 214 Q748 231 742 241 L722 243 L710 238 L700 232 L696 221 L683 210 L677 194 L663 185 Q658 172 666 145Z',
   ],
   scenery:[
    'M0 207 Q15 201 30 197 L31 167 Q43 157 60 158 Q82 149 105 153 Q121 147 142 150 L139 172 L149 188 L158 218 L150 242 L77 247 L78 239 L4 249 L0 242Z',
    'M246 190 Q268 191 283 200 L284 234 L254 241Z',
    'M374 159 L403 153 L421 167 L413 199 L376 193Z M449 153 L472 152 L477 168 L471 193 L444 193 L443 176Z',
    'M651 39 L655 38 L654 57 L642 60 L643 47Z M623 75 L628 74 L628 94 L621 94Z M763 75 L782 73 L781 104 L760 105Z',
   ],
   notes:[
    'M634 0 L639 0 L637 17 L631 19Z M675 24 L683 22 L682 43 L672 46Z M614 80 L617 79 L617 93 L612 94Z M632 97 L637 96 L636 114 L629 115Z M638 96 L651 94 L650 114 L636 114Z',
   ],
  },
  secondary:{
   fabric:[
    'M304 176 Q310 169 317 172 Q335 181 354 174 L369 173 Q375 181 377 194 L379 267 H299 L299 229 Q298 195 304 176Z',
   ],
   scenery:[
    'M410 34 Q443 29 466 34 Q483 40 496 53 L497 84 L483 107 L481 191 L414 192 L409 156Z',
    'M76 159 Q95 154 112 156 L123 187 L86 196 L74 180Z M252 163 L266 162 L273 170 L265 175 L248 171Z',
    'M624 34 L630 31 L628 45 L622 47Z M620 57 L629 54 L628 72 L617 72Z M638 73 L645 71 L644 91 L636 92Z M664 91 L674 89 L671 111 L663 110Z M749 13 L763 9 L762 37 L746 41Z M764 8 L781 2 L780 31 L763 37Z M749 46 L764 42 L763 70 L747 73Z',
   ],
   notes:[
    'M689 18 L698 14 L697 37 L686 40Z M610 97 L616 97 L614 113 L608 114Z M618 96 L629 96 L628 114 L617 114Z M609 117 L614 116 L613 132 L607 132Z',
   ],
  },
 },
];

const clamp=value=>Math.max(0,Math.min(1,value));
function hueAndChroma(r,g,b){
 const max=Math.max(r,g,b),chroma=max-Math.min(r,g,b);
 const sector=max===r?(g-b):max===g?(b-r)+2*chroma:(r-g)+4*chroma;
 return [chroma?(60*sector/chroma+360)%360:0,chroma];
}
function rasterize(paths,width,height,referenceHeight){
 const shapes=paths.map(path=>`<path fill="white" d="${path}"/>`).join('');
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 800 ${referenceHeight}" preserveAspectRatio="none">${shapes}</svg>`;
 return sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer();
}

await mkdir(output,{recursive:true});
for(const photo of artwork){
 const {data,info:{width,height}}=await sharp(fileURLToPath(new URL(photo.name+'.webp',root)))
  .resize({width:960}).removeAlpha().raw().toBuffer({resolveWithObject:true});
 for(const role of ['primary','secondary']){
  const region=photo[role];
  const [fabric,scenery,notes]=await Promise.all([
   rasterize(region.fabric,width,height,photo.height),
   rasterize(region.scenery,width,height,photo.height),
   rasterize(region.notes??[],width,height,photo.height),
  ]);
  const mask=Buffer.alloc(width*height*4);
  for(let i=0;i<width*height;i++){
   const [hue,chroma]=hueAndChroma(data[i*3],data[i*3+1],data[i*3+2]);
   const low=role==='primary'?183:145,high=role==='primary'?265:222;
   // Use a wider hue range for dark and reflected fabric. Geometry supplies
   // the garment edges, while chroma excludes skin, hair and neutral objects.
   const hueWeight=clamp((hue-low)/13)*clamp((high-hue)/13);
   const fabricWeight=clamp((chroma-5)/10);
   const sceneryWeight=clamp((chroma-8)/19);
   const sceneryHue=role==='secondary'?hueWeight*clamp((210-hue)/10):hueWeight;
   const noteWeight=clamp((chroma-10)/20);
   mask[i*4+3]=Math.round(Math.max(fabric[i*4+3]*fabricWeight*hueWeight,scenery[i*4+3]*sceneryWeight*sceneryHue,notes[i*4+3]*noteWeight));
  }
  const destination=fileURLToPath(new URL(`${photo.name}-${role}-v2.webp`,output));
  await sharp(mask,{raw:{width,height,channels:4}}).webp({lossless:true,effort:6}).toFile(destination);
 }
}
