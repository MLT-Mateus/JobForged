// Offline only. Hand-traced garment regions, refined by the original fabric hue.
// The original photographs are neither changed nor copied for each company.
import sharp from 'sharp';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../public/careers/',import.meta.url));
const artwork=[
 ['team-jobforged-v2',533,[
  '255,115 285,99 324,96 337,140 358,174 387,164 408,117 420,101 447,110 472,132 485,282 476,312 430,312 419,275 419,312 310,312 309,286 278,291 271,265 257,244 267,215 277,186 270,149',
 ],[
  '533,250 553,267 582,279 608,278 639,273 680,252 700,251 721,270 749,321 770,367 780,418 719,419 703,401 699,383 657,388 606,397 573,401 549,384 517,376 506,396 514,413 488,413 499,367 506,312 507,269',
 ]],
 ['team-jobforged-panorama-v1',267,[
  '166,66 184,54 204,50 210,78 225,98 241,89 252,65 255,51 275,63 284,141 279,163 255,164 252,151 250,163 193,164 191,151 172,149 166,129 175,105 176,85',
 ],[
  '308,129 321,141 343,142 365,138 390,131 405,137 418,160 433,197 434,217 404,218 397,204 369,203 340,211 319,201 302,196 300,213 283,214 289,189 293,150',
 ]],
 ['culture-jobforged-v1',267,[
  '143,113 156,95 186,78 199,91 217,76 235,88 249,112 255,149 253,170 244,172 246,213 248,246 231,248 208,253 171,250 156,239 156,189 136,175',
  '678,117 685,100 697,102 710,110 728,119 743,124 747,164 750,214 740,242 722,244 699,239 686,227 674,208 668,193 659,171 670,145',
 ],[
  '302,175 315,169 337,179 355,173 372,174 376,190 380,267 299,267 300,222',
 ]]
];
const out=new URL('../public/careers/masks/',import.meta.url);
await mkdir(out,{recursive:true});
for(const [name,refHeight,primary,secondary] of artwork){
 const {data,info:{width,height}}=await sharp(root+name+'.webp').resize({width:640}).removeAlpha().raw().toBuffer({resolveWithObject:true});
 for(const [role,polygons,minHue,maxHue] of [['primary',primary,195,255],['secondary',secondary,155,208]]){
  const svg=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 800 ${refHeight}" preserveAspectRatio="none">${polygons.map(points=>`<polygon fill="white" points="${points}"/>`).join('')}</svg>`);
  const clip=await sharp(svg).ensureAlpha().raw().toBuffer();
  const mask=Buffer.alloc(width*height*4);
  const clamp=n=>Math.min(1,Math.max(0,n));
  for(let i=0;i<width*height;i++){
   const [r,g,b]=data.subarray(i*3,i*3+3),max=Math.max(r,g,b),d=max-Math.min(r,g,b);
   const hue=d?(60*(max===r?(g-b)/d:max===g?(b-r)/d+2:(r-g)/d+4)+360)%360:0;
   const fabric=clamp((hue-minHue)/8)*clamp((maxHue-hue)/8)*clamp((d-8)/16);
   mask[i*4+3]=Math.round(clip[i*4+3]*fabric);
  }
  await sharp(mask,{raw:{width,height,channels:4}}).webp({lossless:true,effort:6}).toFile(fileURLToPath(new URL(`${name}-${role}.webp`,out)));
 }
}
