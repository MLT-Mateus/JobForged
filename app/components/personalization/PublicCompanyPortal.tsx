"use client";
import {useBrandingIcon} from '../ui/useBrandingIcon';
import {PublicPortalAccount} from './PublicPortalAccount';
import {useThemePreference} from '../ui';
import {brandingStyle} from './branding-model';
import {CareerPortalPreview} from './CareerPortalPreview';
import type {Customization} from './personalization-types';
export function PublicCompanyPortal({data,slug}:{data:Customization;slug:string}){
 useBrandingIcon(data.assets.favicon?.url);
 const {theme,changeTheme}=useThemePreference();
 return <div className="company-branding jf-company-portal" style={brandingStyle(data,theme)}><CareerPortalPreview data={data} theme={theme} mode="public" onThemeChange={changeTheme} account={<PublicPortalAccount slug={slug}/>}/></div>;
}
