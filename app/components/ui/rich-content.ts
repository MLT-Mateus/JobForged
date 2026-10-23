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
  const color=token.match(/^<(span|font)\s+(?:style=["']\s*color:\s*(#[0-9a-f]{6}|rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\))\s*;?\s*["']|color=["'](#[0-9a-f]{6})["'])>$/i);
  if(color){let hex=color[2]||color[3];if(hex.startsWith('rgb'))hex='#'+(hex.match(/\d+/g)||[]).map(n=>Math.min(255,Number(n)).toString(16).padStart(2,'0')).join('');output+=`<${color[1].toLowerCase()} style="color:${hex.toUpperCase()}">`;stack.push(color[1].toLowerCase());continue}
  // Drop unsupported tags and all attributes, never emit executable markup.
 }
 while(stack.length)output+=`</${stack.pop()}>`;return output;
}
export function richTextPlain(value:string){return sanitizeRichText(value).replace(/<br>|<\/(?:p|div)>/g,' ').replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&')}
