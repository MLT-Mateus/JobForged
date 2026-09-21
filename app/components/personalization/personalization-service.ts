"use client";
import {defaultCustomization,initialHistory} from "./personalization-mocks";
import type {Customization,HistoryEntry,OrganizationBanner,Palette,ThemeSettings} from "./personalization-types";
const DRAFT="jobforged.customization.draft.v2",PUBLISHED="jobforged.customization.published.v2",HISTORY="jobforged.customization.history.v2";
const clone=<T,>(x:T):T=>JSON.parse(JSON.stringify(x));
const read=<T,>(key:string,fallback:T):T=>{if(typeof window==="undefined")return clone(fallback);try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):clone(fallback)}catch{return clone(fallback)}};
const write=(key:string,value:unknown)=>{if(typeof window!=="undefined")localStorage.setItem(key,JSON.stringify(value))};
const stamp=(c:Customization)=>({...c,draftUpdatedAt:new Date().toISOString()});
export const customizationService={
 async getOrganizationTheme(organizationId:string){const draft=read(DRAFT,defaultCustomization);return draft.organizationId===organizationId?draft:clone(defaultCustomization)},
 async getPublishedCustomization(organizationId:string){const published=read(PUBLISHED,defaultCustomization);return published.organizationId===organizationId?published:clone(defaultCustomization)},
 async saveOrganizationTheme(input:Customization){const saved=stamp(input);write(DRAFT,saved);return saved},
 async updateBrandAssets(input:Customization){return this.saveOrganizationTheme(input)},
 async updateColorPalette(input:Customization,palette:Palette){return this.saveOrganizationTheme({...input,palette})},
 async updateThemeSettings(input:Customization,theme:ThemeSettings){return this.saveOrganizationTheme({...input,theme})},
 async listBanners(organizationId:string){return (await this.getOrganizationTheme(organizationId)).banners},
 async createBanner(input:Customization,banner:OrganizationBanner){return this.saveOrganizationTheme({...input,banners:[...input.banners,banner]})},
 async updateBanner(input:Customization,banner:OrganizationBanner){return this.saveOrganizationTheme({...input,banners:input.banners.map(x=>x.id===banner.id?banner:x)})},
 async reorderBanners(input:Customization,banners:OrganizationBanner[]){return this.saveOrganizationTheme({...input,banners:banners.map((x,i)=>({...x,order:i}))})},
 async deleteBanner(input:Customization,id:string){return this.saveOrganizationTheme({...input,banners:input.banners.filter(x=>x.id!==id)})},
 async updateCareerPortal(input:Customization){return this.saveOrganizationTheme(input)},
 async resetCustomization(organizationId:string){const reset={...clone(defaultCustomization),organizationId,draftUpdatedAt:new Date().toISOString()};write(DRAFT,reset);return reset},
 async discardDraft(organizationId:string){const published=await this.getPublishedCustomization(organizationId);write(DRAFT,published);return published},
 async publishCustomization(input:Customization,actor="Mateus Batista"){const published={...stamp(input),publishedAt:new Date().toISOString(),publishedBy:actor,revision:input.revision+1};write(PUBLISHED,published);write(DRAFT,published);const history=read<HistoryEntry[]>(HISTORY,initialHistory);write(HISTORY,[{id:`history-${Date.now()}`,organizationId:input.organizationId,createdAt:published.publishedAt,actor,type:"Personalização publicada",status:"Publicado",snapshot:published},...history]);if(typeof window!=="undefined")window.dispatchEvent(new CustomEvent("jobforged-customization-published",{detail:published}));return published},
 async getHistory(organizationId:string){return read<HistoryEntry[]>(HISTORY,initialHistory).filter(x=>x.organizationId===organizationId)},
 async restoreVersion(entry:HistoryEntry){const restored={...clone(entry.snapshot),draftUpdatedAt:new Date().toISOString()};write(DRAFT,restored);return restored}
};
export const getPublishedPalette=()=>read(PUBLISHED,defaultCustomization).palette;
