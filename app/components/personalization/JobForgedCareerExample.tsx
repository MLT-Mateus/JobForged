"use client";
import {CareerPortalPreview} from './CareerPortalPreview';
import {jobforgedCareerExample} from './jobforged-career-example';
import {brandingStyle} from './branding-model';
import {useThemePreference} from '../ui';
export function JobForgedCareerExample(){const {theme}=useThemePreference(),data=jobforgedCareerExample();return <main className="company-branding jf-career-example" style={brandingStyle(data,theme)}><CareerPortalPreview data={data} theme={theme}/></main>}
