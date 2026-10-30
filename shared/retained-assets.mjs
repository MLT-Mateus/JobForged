import {readdir,lstat,mkdir,readFile,writeFile,copyFile,rm,realpath,chmod,utimes} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
export const validAssetName=name=>typeof name==='string'&&name.length<=220&&/^[A-Za-z0-9_][A-Za-z0-9_.-]*-[A-Za-z0-9_-]{8,}\.(?:js|css|woff2?|png|jpe?g|webp|avif|gif|svg|ico)$/.test(name);
const revisionPattern=/^[a-f0-9]{40}$/;
export async function retainAssets(source,destination,revision,keep=4){
 if(!revisionPattern.test(revision)||!Number.isInteger(keep)||keep<2||keep>8)throw new Error('Invalid asset retention arguments');
 await mkdir(destination,{recursive:true,mode:0o755});const root=await realpath(destination),folder=path.join(root,revision);
 try{if((await lstat(folder)).isSymbolicLink())throw new Error('Unsafe release directory')}catch(e){if(e.code!=='ENOENT')throw e}
 await mkdir(folder,{recursive:true,mode:0o755});let count=0;
 for(const name of await readdir(source)){
  if(!validAssetName(name))continue;const file=path.join(source,name),stat=await lstat(file);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.size>32*1024*1024)continue;
  const target=path.join(folder,name);try{const existing=await lstat(target);if(!existing.isFile()||existing.isSymbolicLink())throw new Error('Unsafe cached asset');
   const digest=b=>createHash('sha256').update(b).digest('hex');if(digest(await readFile(target))!==digest(await readFile(file)))throw new Error('Immutable release asset mismatch');
  }catch(e){if(e.code!=='ENOENT')throw e;await copyFile(file,target);await chmod(target,0o644)}count++;
 }
 if(!count)throw new Error('No public hashed assets in image');
 const marker=path.join(folder,'.complete');try{const info=await lstat(marker);if(!info.isFile()||info.isSymbolicLink())throw new Error('Unsafe completion marker')}catch(e){if(e.code!=='ENOENT')throw e}
 await writeFile(marker,String(count),{mode:0o644});await utimes(folder,new Date(),new Date());
 const versions=[];for(const name of await readdir(root)){if(!revisionPattern.test(name))continue;const stat=await lstat(path.join(root,name));if(stat.isDirectory()&&!stat.isSymbolicLink())versions.push({name,mtime:stat.mtimeMs})}
 versions.sort((a,b)=>b.mtime-a.mtime);
 for(const {name} of versions.slice(keep)){
  const candidate=path.resolve(root,name);if(path.dirname(candidate)!==root||await realpath(candidate)!==candidate)throw new Error('Unsafe retention cleanup');
  await rm(candidate,{recursive:true});
 }
 return {revision,assets:count,retained:Math.min(keep,versions.length)};
}
const mime={js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',woff:'font/woff',woff2:'font/woff2',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',avif:'image/avif',gif:'image/gif',svg:'image/svg+xml',ico:'image/x-icon'};
export async function retainedAsset(root,name){
 if(!root||!validAssetName(name))return null;
 try{const base=await realpath(root);for(const revision of (await readdir(base)).filter(n=>revisionPattern.test(n)).slice(0,8)){
  const folder=path.join(base,revision),info=await lstat(folder);if(!info.isDirectory()||info.isSymbolicLink())continue;
  try{const marker=await lstat(path.join(folder,'.complete'));if(!marker.isFile()||marker.isSymbolicLink())continue;const file=path.join(folder,name),stat=await lstat(file);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>32*1024*1024)continue;
   return {bytes:new Uint8Array(await readFile(file)),mime:mime[name.split('.').at(-1)]};
  }catch(e){if(e.code!=='ENOENT')throw e}
 }}catch{return null}return null;
}
