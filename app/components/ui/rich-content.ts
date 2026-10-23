/** Small, deterministic allowlist shared by editor, server validation and rendering. */
export function sanitizeRichText(value:string){
 const text=(v:string)=>v.replace(/&(?!(?:amp|lt|gt|quot|#39|nbsp);)/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
 const stack:string[]=[];let output='';
 for(const token of value.slice(0,12000).match(/<[^>]*>|[^<]+|</g)||[]){
  if(!token.startsWith('<')){output+=text(token);continue}
  if(/^<\/?(?:p|div|li)>$/i.test(token)){if(!token.startsWith('</'))output+='<br>';continue}
  const closing=token.match(/^<\/(b|strong|i|em|u|span|font|p|div)>$/i);
  if(closing){const tag=closing[1].toLowerCase(),index=stack.lastIndexOf(tag);if(index>=0){while(stack.length>index)output+=`</${stack.pop()}>`}continue}
  if(/^<br\s*\/?>$/i.test(token)){output+='<br>';continue}
  const opening=token.match(/^<(b|strong|i|em|u|p|div)>$/i);
  if(opening){const tag=opening[1].toLowerCase();output+=`<${tag}>`;stack.push(tag);continue}
  const size=token.match(/^<span style=["']font-size:(16|18|24|32)px;?["']>$/i);if(size){output+=`<span style="font-size:${size[1]}px">`;stack.push('span');continue}
  const color=token.match(/^<(span|font)\s+(?:style=["']\s*color:\s*(#[0-9a-f]{6}|rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\))\s*;?\s*["']|color=["'](#[0-9a-f]{6})["'])>$/i);
  if(color){let hex=color[2]||color[3];if(hex.startsWith('rgb'))hex='#'+(hex.match(/\d+/g)||[]).map(n=>Math.min(255,Number(n)).toString(16).padStart(2,'0')).join('');output+=`<${color[1].toLowerCase()} style="color:${hex.toUpperCase()}">`;stack.push(color[1].toLowerCase());continue}
  // Drop unsupported tags and all attributes, never emit executable markup.
 }
 while(stack.length)output+=`</${stack.pop()}>`;return output;
}
export function richTextPlain(value:string){return renderRichText(value).replace(/<br>|<\/(?:p|div)>/g,' ').replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&')}

/** Interpret only documented BBCode parameters, then pass through the HTML allowlist. */
export function renderRichText(value:string){
 const tags:{name:string;html:string}[]=[];
 const converted=value.slice(0,12000).replace(/\[(\/?)(b|i|u|color|size|br)(?:=([^\]\r\n]*))?\]/gi,(token,closing:string,name:string,arg:string|undefined)=>{
  name=name.toLowerCase();
  if(name==='br')return !closing&&!arg?'<br>':token;
  if(closing){if(arg||tags.at(-1)?.name!==name)return token;return `</${tags.pop()!.html}>`}
  let html=name;
  if(name==='color'){if(!arg||!/^#[0-9a-f]{6}$/i.test(arg))return token;html='span';tags.push({name,html});return `<span style="color:${arg.toUpperCase()}">`}
  if(name==='size'){if(!arg||!['16','18','24','32'].includes(arg))return token;html='span';tags.push({name,html});return `<span style="font-size:${arg}px">`}
  if(arg)return token;tags.push({name,html});return `<${html}>`;
 });
 return sanitizeRichText(converted+tags.reverse().map(tag=>`</${tag.html}>`).join(''));
}
/** Legacy HTML stays editable as source parameters; published storage remains canonical safe HTML. */
export function richTextSource(value:string){
 const stack:string[]=[];
 const source=sanitizeRichText(value).replace(/<[^>]*>/g,token=>{
  if(token==='<br>')return '\n';
  if(token.startsWith('</'))return stack.pop()||'';
  const color=token.match(/^<(?:span|font) style="color:(#[0-9A-F]{6})">$/i);if(color){stack.push('[/color]');return `[color=${color[1]}]`}
  const size=token.match(/^<span style="font-size:(\d+)px">$/);if(size){stack.push('[/size]');return `[size=${size[1]}]`}
  const tag=token.slice(1,-1),name=tag==='strong'?'b':tag==='em'?'i':tag;if(['b','i','u'].includes(name)){stack.push(`[/${name}]`);return `[${name}]`}stack.push('');return '';
 });
 return source.replace(/&nbsp;/g,' ').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&');
}
