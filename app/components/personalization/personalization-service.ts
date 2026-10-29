"use client";
import { brandingDefaults, brandContent } from './branding-model';
import type { Customization, HistoryEntry, BrandAsset } from './personalization-types';
type Stored = {companyId:string;companyName:string;editable:boolean;version:number;draft:object|null;published:object;publishedVersion:number;updatedAt:string;publishedAt:string;publishedBy:string;history:Array<{id:string;version:number;snapshot:object;created_at:string;actor:string}>};
export type BrandingSnapshot={companyName:string;draft:Customization;published:Customization;history:HistoryEntry[];editable:boolean};
function unpack(row:Stored):BrandingSnapshot {
 const base=brandingDefaults(row.companyId,row.companyName);
 const hydrate=(value:object|null,version=row.version):Customization=>({...base,...(value&&Object.keys(value).length?value:{}),organizationId:row.companyId,revision:version,draftUpdatedAt:row.updatedAt||'',publishedAt:row.publishedAt||'',publishedBy:row.publishedBy||''});
 return {companyName:row.companyName,draft:hydrate(row.editable?row.draft:row.published),published:hydrate(row.published),editable:row.editable,history:row.history.map(entry=>({id:entry.id,organizationId:row.companyId,createdAt:entry.created_at,actor:entry.actor,type:`Identidade publicada · versão ${entry.version}`,status:'Publicado',snapshot:hydrate(entry.snapshot,entry.version)}))};
}
async function load():Promise<BrandingSnapshot>{const response=await fetch('/api/company/branding',{cache:'no-store',credentials:'same-origin'});if(!response.ok)throw new Error('Não foi possível carregar a identidade da sua empresa.');return unpack(await response.json() as Stored)}
async function mutate(operation:string,input:Customization,historyId?:string){
 const response=await fetch('/api/company/branding',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({operation,companyId:input.organizationId,version:input.revision,configuration:brandContent(input),historyId})});
 const result=await response.json() as {version?:number;message?:string};if(!response.ok)throw new Error(result.message||'Não foi possível salvar.');
 const next=await load();if(next.draft.revision!==result.version)throw new Error('A operação foi registrada, mas outra sessão alterou o rascunho em seguida. Recarregue antes de continuar; seus campos foram preservados.');
 if(operation==='publish')window.dispatchEvent(new CustomEvent('jobforged-customization-published',{detail:{companyId:input.organizationId}}));
 return next;
}
export const customizationService={
 load,
 async saveOrganizationTheme(input:Customization){return (await mutate('save',input)).draft},
 async publishCustomization(input:Customization){return (await mutate('publish',input)).published},
 async discardDraft(input:Customization){return (await mutate('discard',input)).draft},
 async resetCustomization(input:Customization){return (await mutate('reset',input)).draft},
 async restoreVersion(entry:HistoryEntry,input:Customization){return (await mutate('restore',input,entry.id)).draft},
 async getHistory(){return (await load()).history},
 async uploadAsset(file:File,kind:string,companyId:string):Promise<BrandAsset>{const form=new FormData();form.set('file',file);form.set('kind',kind);form.set('companyId',companyId);const response=await fetch('/api/company/branding/assets',{method:'POST',credentials:'same-origin',body:form});const result=await response.json() as {asset:BrandAsset;message?:string};if(!response.ok)throw new Error(result.message||'Não foi possível enviar a imagem.');return result.asset}
};