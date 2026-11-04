"use client";
import {useEffect} from 'react';
/** Only a verified square icon may replace the platform symbol; never use a logo. */
export function useBrandingIcon(url?:string){useEffect(()=>{
 const root=document.documentElement,previous=root.dataset.companyIcon;
 const current=url&&/^\/api\/(?:company\/branding\/assets\/|portals\/[^/]+\/assets\/)[a-f0-9-]+$/i.test(url)?url:'';
 let cancelled=false;const image=current?new Image():null;
 root.dataset.companyIcon='';
 if(image){image.onload=()=>{if(!cancelled)root.dataset.companyIcon=image.naturalWidth>0&&image.naturalWidth===image.naturalHeight?current:''};image.onerror=()=>{if(!cancelled)root.dataset.companyIcon=''};image.src=current}
 return()=>{cancelled=true;if(image){image.onload=null;image.onerror=null}if(root.dataset.companyIcon===current||root.dataset.companyIcon===''){if(previous===undefined)delete root.dataset.companyIcon;else root.dataset.companyIcon=previous}};
},[url])}
