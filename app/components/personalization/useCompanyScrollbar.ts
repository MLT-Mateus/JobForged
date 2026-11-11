"use client";
import {useEffect} from 'react';
import {brandingScrollbarStyle,paletteFor} from './branding-model';
import {applyDocumentScrollbar} from './document-scrollbar';
import type {Customization} from './personalization-types';

/** Scoped to real company pages; previews retain their own inherited tokens. */
export function useCompanyScrollbar(value:Customization|null,theme:'light'|'dark'){
 useEffect(()=>{
  if(!value)return;
  const palette=paletteFor(value,theme);
  const colors={'--jf-loader-primary':palette.primary,'--jf-loader-secondary':palette.secondary,'--jf-loader-surface':palette.background};
  if(document.documentElement.dataset.loaderSeed){for(const key of Object.keys(colors))document.documentElement.style.removeProperty(key);delete document.documentElement.dataset.loaderSeed;}
  const restore=applyDocumentScrollbar(document.documentElement.style,{...brandingScrollbarStyle(value,theme),...colors});
  // Public colors only; scoped to this host and route family, never account data.
  try{const scope=location.pathname.startsWith('/app/')?'/app/':location.pathname==='/'?'/':location.pathname.split('/').slice(0,2).join('/')+'/';
   const palettes=Object.fromEntries((['light','dark'] as const).map(mode=>{const p=paletteFor(value,mode);return [mode,{primary:p.primary,secondary:p.secondary,surface:p.background}]}));
   sessionStorage.setItem('jobforged-loader-colors',JSON.stringify({scope,palettes,theme,allowSwitch:value.theme.allowSwitch}));
  }catch{/* Inherited tokens still cover this document. */}
  return restore;
 },[value,theme]);
}
