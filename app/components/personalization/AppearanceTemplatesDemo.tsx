"use client";
import {useState} from 'react';
import {ColorField} from '../ui';
import {AppearanceTemplatePicker} from './AppearanceTemplates';
import {PreviewContent} from './AppearancePreview';
import {brandingDefaults,brandingStyle} from './branding-model';
import type {AppearanceLayout} from './personalization-types';
export function AppearanceTemplatesDemo({theme}:{theme:'light'|'dark'}){
 const [layout,setLayout]=useState<AppearanceLayout>('classico'),[primary,setPrimary]=useState('#20B2AA'),data=brandingDefaults('design-system-demo','Sua empresa');data.portal.layout=layout;data.palette.primary=primary;
 return <div className="jf-workspace-stack"><h3>Templates de aparência</h3><ColorField label="Cor principal da prévia" value={primary} previous="#20B2AA" onChange={setPrimary}/><AppearanceTemplatePicker value={layout} onChange={setLayout}/><div className="custom-preview company-branding" style={brandingStyle(data,theme)}><div className="preview-stage is-desktop"><PreviewContent surface="portal" data={data} theme={theme}/></div></div></div>;
}
