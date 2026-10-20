"use client";
import {useState} from 'react';
import {VisualPageBuilder} from './VisualPageBuilder';
import {ColorField,FontPairPicker} from '../ui';
import {AppearanceTemplatePicker} from './AppearanceTemplates';
import {PreviewContent} from './AppearancePreview';
import {brandingDefaults,brandingStyle} from './branding-model';
import type {AppearanceLayout} from './personalization-types';
export function AppearanceTemplatesDemo({theme}:{theme:'light'|'dark'}){
 const [layout,setLayout]=useState<AppearanceLayout>('classico'),[primary,setPrimary]=useState('#20B2AA'),[fontPair,setFontPair]=useState<import('../ui/font-pairs').FontPairId>('jobforged'),data=brandingDefaults('design-system-demo','Sua empresa');data.portal.layout=layout;data.palette.primary=primary;data.typography.fontPair=fontPair;
 return <div className="jf-workspace-stack"><h3>Templates de aparência</h3><ColorField label="Cor principal da prévia" value={primary} previous="#20B2AA" onChange={setPrimary}/><FontPairPicker value={fontPair} onChange={setFontPair}/><AppearanceTemplatePicker value={layout} onChange={setLayout}/><div className="custom-preview company-branding" style={brandingStyle(data,theme)}><div className="preview-stage is-desktop"><PreviewContent surface="portal" data={data} theme={theme}/></div></div><h3>Construtor visual · demonstração</h3><VisualPageBuilder source={data} theme={theme}/></div>;
}
