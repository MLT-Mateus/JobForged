import type {CSSProperties} from 'react';

/** The viewport scrollbar belongs to html, not to the branded page wrapper. */
export function applyDocumentScrollbar(style:CSSStyleDeclaration,colors:CSSProperties){
 const changes=Object.entries(colors).map(([name,color])=>({name,value:String(color),before:style.getPropertyValue(name),priority:style.getPropertyPriority(name)}));
 for(const {name,value} of changes)style.setProperty(name,value);
 return()=>{
  for(const {name,value,before,priority} of changes){
   if(style.getPropertyValue(name)!==value)continue;
   if(before)style.setProperty(name,before,priority);else style.removeProperty(name);
  }
 };
}
