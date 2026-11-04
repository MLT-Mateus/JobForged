"use client";
import {useEffect} from 'react';
/** Scope the browser icon to the active company page and restore on exit. */
export function useBrandingIcon(url?:string){useEffect(()=>{const root=document.documentElement,previous=root.dataset.companyIcon;const current=url?.startsWith('/api/')?url:'';root.dataset.companyIcon=current;return()=>{if(root.dataset.companyIcon===current){if(previous===undefined)delete root.dataset.companyIcon;else root.dataset.companyIcon=previous}}},[url])}
