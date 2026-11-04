"use client";
import {useBrandingIcon} from '../ui/useBrandingIcon';
import {PublicPortalAccount} from './PublicPortalAccount';
import {useThemePreference} from '../ui';
import {brandingStyle,brandingIcon} from './branding-model';
import {CareerPortalPreview} from './CareerPortalPreview';
import type {Customization} from './personalization-types';
export function PublicCompanyPortal({data,slug,externalAccountHref,initialLogin=false}:{data:Customization;slug:string;externalAccountHref?:string;initialLogin?:boolean}){
 const {theme,changeTheme}=useThemePreference();
 useBrandingIcon(brandingIcon(data,theme));
 return <div className="company-branding jf-company-portal" style={brandingStyle(data,theme)}><CareerPortalPreview data={data} theme={theme} mode="public" onThemeChange={changeTheme} account={<PublicPortalAccount slug={slug} externalAccountHref={externalAccountHref} initialLogin={initialLogin}/>}/></div>;
}
