import {readdirSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import type {Plugin} from 'vite';
export function scanPages(root=resolve('app')){
 const routes=new Set<string>();
 function walk(directory:string,parts:string[]){const entries=readdirSync(directory,{withFileTypes:true});if(entries.some(e=>e.isFile()&&e.name==='page.tsx'))routes.add('/'+parts.join('/'));for(const e of entries)if(e.isDirectory()&&!e.name.startsWith('@')&&!e.name.startsWith('_'))walk(resolve(directory,e.name),e.name.startsWith('(')?parts:[...parts,e.name])}
 walk(root,[]);
 const source=readFileSync(resolve(root,'design-system/DesignSystemClient.tsx'),'utf8'),nav=source.slice(source.indexOf('const navigation = ['),source.indexOf('const dashboardFunnel'));
 for(const match of nav.matchAll(/id:\s*"([a-z-]+)"/g))routes.add('/design-system/'+match[1]);
 const protectedRoots=['home','vagas','candidaturas','agenda','administradores','dashboards','configuracoes','financeiro','minha-conta','personalizacao','candidato'];
 return [...routes].sort((a,b)=>a==='/'?-1:b==='/'?1:a.localeCompare(b)).map(path=>({path,title:path==='/'?'Página inicial':path.split('/').filter(Boolean).map(p=>p.replace(/[-_]/g,' ')).join(' / '),dynamic:path.includes('['),access:path.startsWith('/backoffice')?'Backoffice':path.startsWith('/app')||protectedRoots.includes(path.split('/')[1])?'Login necessário':'Pública'}));
}
export function pageCatalogPlugin():Plugin{return{name:'jobforged-page-catalog',resolveId(id){if(id==='virtual:jobforged-pages')return '\0jobforged-pages'},load(id){if(id==='\0jobforged-pages')return 'export const pages='+JSON.stringify(scanPages())},configureServer(server){const refresh=(file:string)=>{if(!file.replaceAll('\\','/').endsWith('/page.tsx')&&!file.endsWith('DesignSystemClient.tsx'))return;const m=server.moduleGraph.getModuleById('\0jobforged-pages');if(m)server.moduleGraph.invalidateModule(m);server.ws.send({type:'full-reload'})};server.watcher.on('add',refresh);server.watcher.on('unlink',refresh);server.watcher.on('change',refresh)}}}
