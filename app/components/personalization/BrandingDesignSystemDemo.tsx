"use client";
import {useState} from 'react';
import {SelectField} from '../ui';
import {fontPairs,type FontPairId} from '../ui/font-pairs';
import {brandingDefaults} from './branding-model';
import {CompanyPanelPreview} from './CompanyPanelPreview';
export function BrandingDesignSystemDemo({theme}:{theme:'light'|'dark'}){
 const [pair,setPair]=useState<FontPairId>('jobforged'),data=brandingDefaults('design-system-demo','Sua empresa');data.typography.fontPair=pair;
 return <section className="jf-workspace-stack"><h3>Identidade aplicada aos componentes</h3><SelectField label="Par tipográfico da demonstração" value={pair} onValueChange={value=>setPair(value as FontPairId)} options={fontPairs.map(p=>({value:p.id,label:`${p.label} · ${p.headingName} + ${p.bodyName}`}))}/><CompanyPanelPreview data={data} theme={theme}/></section>;
}
