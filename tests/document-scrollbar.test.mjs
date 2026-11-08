import assert from 'node:assert/strict';
import test from 'node:test';
import {applyDocumentScrollbar} from '../app/components/personalization/document-scrollbar.ts';
import {brandingDefaults,brandingScrollbarStyle,contrast} from '../app/components/personalization/branding-model.ts';
import {applyBrandColors,colorPresets} from '../app/components/personalization/brand-colors.ts';

function rootStyle(){
 const values=new Map(),priorities=new Map();
 return {getPropertyValue:name=>values.get(name)||'',getPropertyPriority:name=>priorities.get(name)||'',setProperty(name,value,priority=''){values.set(name,value);priorities.set(name,priority)},removeProperty(name){const before=values.get(name)||'';values.delete(name);priorities.delete(name);return before}};
}
test('paletas prontas e manuais chegam ao documento e restauram a marca anterior ao sair',()=>{
 const root=rootStyle(),property='--app-scrollbar-thumb-end';root.setProperty(property,'#123456','important');
 const original=brandingDefaults('company','Company');
 const palettes=[...colorPresets.map(x=>x.colors),{...colorPresets[0].colors,primary:'#B23467'}];
 for(const palette of palettes){for(const theme of ['light','dark']){
  const config=applyBrandColors(original,palette),colors=brandingScrollbarStyle(config,theme),cleanup=applyDocumentScrollbar(root,colors);
  assert.equal(root.getPropertyValue(property),colors[property]);
  for(const surface of [config.theme[theme].background,config.theme[theme].surface])assert.ok(contrast(root.getPropertyValue(property),surface)>=3);
  cleanup();assert.equal(root.getPropertyValue(property),'#123456');assert.equal(root.getPropertyPriority(property),'important');assert.equal(root.getPropertyValue('--jf-ui-scrollbar-thumb'),'');
 }}
});
test('a limpeza não sobrescreve uma cor aplicada por outro proprietário',()=>{
 const root=rootStyle(),cleanup=applyDocumentScrollbar(root,{'--app-scrollbar-thumb-end':'#7C3AED'});
 root.setProperty('--app-scrollbar-thumb-end','#FF0000');cleanup();assert.equal(root.getPropertyValue('--app-scrollbar-thumb-end'),'#FF0000');
});
