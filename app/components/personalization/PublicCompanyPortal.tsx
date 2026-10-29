"use client";
import {useBrandingIcon} from '../ui/useBrandingIcon';
import {useState} from 'react';
import {useThemePreference} from '../ui';
import {brandingStyle} from './branding-model';
import {CareerPortalPreview} from './CareerPortalPreview';
import type {Customization} from './personalization-types';
export function PublicCompanyPortal({data}:{data:Customization}){
 useBrandingIcon(data.assets.favicon?.url);
 const {theme:preference}=useThemePreference();const [choice,setChoice]=useState<'light'|'dark'|null>(null);
 const theme=choice??(data.theme.defaultMode==='system'?preference:data.theme.defaultMode);
 return <div className="company-branding jf-company-portal" style={brandingStyle(data,theme)}><CareerPortalPreview data={data} theme={theme} mode="public" onThemeChange={setChoice}/></div>;
}
