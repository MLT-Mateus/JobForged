export const imageAccept='.png,.jpg,.jpeg,.webp,.avif,.svg,image/png,image/jpeg,image/webp,image/avif,image/svg+xml';
export const imageFormats='PNG, JPEG, WebP, AVIF ou SVG simples';
const extensions:Record<string,string>={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',avif:'image/avif',svg:'image/svg+xml'};
export function imageMime(name:string,declared:string){
 const expected=extensions[name.toLowerCase().split('.').at(-1)||''];
 if(!expected||declared&&declared!=='application/octet-stream'&&declared!==expected)return null;
 return expected;
}
export function fileMatchesAccept(file:{name:string;type:string},accept:string){
 const rules=accept.split(',').map(x=>x.trim().toLowerCase()).filter(Boolean),name=file.name.toLowerCase(),mime=file.type.toLowerCase();
 return !rules.length||rules.some(rule=>rule.startsWith('.')?name.endsWith(rule):rule.endsWith('/*')?mime.startsWith(rule.slice(0,-1)):mime===rule);
}
export function imageUploadOptions(file:File,fields:Record<string,string>={}){
 const mime=imageMime(file.name,file.type);if(!mime)throw Error(`Use ${imageFormats}. Para HEIC/HEIF ou HVIF, exporte para um formato compatível.`);
 if(mime==='image/svg+xml'&&file.size>1048576)throw Error('Use um SVG simples de até 1 MB ou exporte para PNG.');
 return {method:'POST',credentials:'same-origin' as const,headers:{'Content-Type':mime,'X-Upload-Name':encodeURIComponent(file.name),...fields},body:file};
}
