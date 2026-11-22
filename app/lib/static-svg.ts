import {DOMParser,XMLSerializer,DOMImplementation} from '@xmldom/xmldom';
const ns='http://www.w3.org/2000/svg';
const elements=new Set(['svg','g','path','rect','circle','ellipse','line','polygon','polyline','defs','clipPath','linearGradient','radialGradient','stop','text','tspan','title','desc']);
const attributes=new Set(['id','viewBox','width','height','x','y','x1','y1','x2','y2','cx','cy','r','rx','ry','d','points','transform','gradientTransform','gradientUnits','offset','stop-color','stop-opacity','fill','fill-rule','fill-opacity','stroke','stroke-width','stroke-opacity','stroke-linecap','stroke-linejoin','stroke-miterlimit','stroke-dasharray','stroke-dashoffset','opacity','clip-path','clip-rule','clipPathUnits','preserveAspectRatio','font-family','font-size','font-weight','text-anchor','dominant-baseline']);
const styles=new Set(['fill','fill-opacity','fill-rule','stroke','stroke-width','stroke-opacity','stroke-linecap','stroke-linejoin','opacity','font-family','font-size','font-weight','text-anchor']);
const error=()=>new Error('Use um SVG simples de até 1 MB, sem scripts, estilos externos, imagens incorporadas ou links. Exporte para PNG se necessário.');
function valueSafe(value:string){return value.length<=262144&&!/[<>\\\u0000-\u0008]/.test(value)&&(!/url\s*\(/i.test(value)||/^url\(\s*#[\w.-]+\s*\)$/.test(value))&&!/(?:https?:|data:|file:|javascript:|@import|expression\s*\()/i.test(value)}
/** Rebuild an allowlisted static SVG; the original is never served or stored. */
export function staticSvg(input:Uint8Array){
 if(input.byteLength>1048576)throw error();
 const text=new TextDecoder('utf-8',{fatal:true}).decode(input);
 if(/<!DOCTYPE|<!ENTITY/i.test(text))throw error();
 const document=new DOMParser({onError:()=>{throw error()}}).parseFromString(text,'image/svg+xml');
 const root=document.documentElement;if(!root||root.nodeName!=='svg'||root.namespaceURI!==ns)throw error();
 const output=new DOMImplementation().createDocument(ns,'svg',null);let nodes=0;
 function copy(source:typeof root,target:typeof root,depth:number){
  if(!source||!target||depth>32||++nodes>5000||!elements.has(source.nodeName)||source.namespaceURI!==ns)throw error();
  for(let i=0;i<source.attributes.length;i++){
   const a=source.attributes.item(i)!;
   if(a.name==='xmlns'||a.name==='xmlns:xlink'||a.name==='version'||a.name==='role'||a.name.startsWith('aria-'))continue;
   if(a.name==='style'){
    for(const part of a.value.split(';').filter(x=>x.trim())){const at=part.indexOf(':'),key=part.slice(0,at).trim(),value=part.slice(at+1).trim();if(at<1||!styles.has(key)||!valueSafe(value))throw error();target.setAttribute(key,value)}
   }else{if(!attributes.has(a.name)||!valueSafe(a.value))throw error();target.setAttribute(a.name,a.value)}
  }
  for(let child=source.firstChild;child;child=child.nextSibling){
   if(child.nodeType===1){const element=child as typeof root;const next=output.createElementNS(ns,element!.nodeName);target.appendChild(next);copy(element,next,depth+1)}
   else if(child.nodeType===3){if(!['text','tspan','title','desc'].includes(source.nodeName)&&child.nodeValue?.trim())throw error();target.appendChild(output.createTextNode(child.nodeValue||''))}
   else if(child.nodeType!==8)throw error();
  }
 }
 copy(root,output.documentElement,0);
 const box=(root.getAttribute('viewBox')||'').trim().split(/[\s,]+/).map(Number);
 for(const [index,key] of ['width','height'].entries()){
  const raw=root.getAttribute(key)||'',number=!raw||raw.endsWith('%')?box[index+2]:Number(raw.replace(/px$/,''));
  if(!Number.isFinite(number)||number<=0||number>4096)throw error();output.documentElement!.setAttribute(key,String(number));
 }
 return Buffer.from(new XMLSerializer().serializeToString(output));
}
