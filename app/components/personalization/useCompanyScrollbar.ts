"use client";
import {useEffect} from 'react';
import {brandingScrollbarStyle} from './branding-model';
import {applyDocumentScrollbar} from './document-scrollbar';
import type {Customization} from './personalization-types';

/** Scoped to real company pages; previews retain their own inherited tokens. */
export function useCompanyScrollbar(value:Customization|null,theme:'light'|'dark'){
 useEffect(()=>{
  if(!value)return;
  return applyDocumentScrollbar(document.documentElement.style,brandingScrollbarStyle(value,theme));
 },[value,theme]);
}
