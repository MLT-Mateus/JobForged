"use client";
import {useRef,useState} from 'react';
import {RotateCcw} from 'lucide-react';
import {TextField} from './FormControls';
import {ActionButton} from './AdminPrimitives';
/** Shared hexadecimal editor and native picker, without nested controls. */
export function ColorField({label,value,previous,onChange}:{label:string;value:string;previous?:string;onChange:(value:string)=>void}){
 const valid=/^#[0-9A-F]{6}$/i.test(value),picker=useRef<HTMLInputElement>(null);
 const [lastValid,setLastValid]=useState(valid?value:'#20B2AA');
 const commit=(next:string)=>{if(/^#[0-9A-F]{6}$/i.test(next))setLastValid(next);else if(valid)setLastValid(value);onChange(next)};
 const color=valid?value:lastValid;
 return <div className="jf-color-field"><TextField label={label} value={value} placeholder="#RRGGBB" maxLength={7} spellCheck={false} autoComplete="off" onChange={e=>commit(e.target.value.toUpperCase())} error={valid?undefined:"Use seis dígitos no formato #RRGGBB."}/><div className="jf-color-field__actions"><ActionButton variant="secondary" icon={<span className="jf-color-field__swatch" style={{background:color}} aria-hidden="true"/>} aria-label={`Escolher ${label}`} onClick={()=>picker.current?.click()}>Escolher cor</ActionButton><input ref={picker} className="jf-visually-hidden" type="color" tabIndex={-1} value={color} aria-label={`Seletor de ${label}`} onChange={e=>commit(e.target.value.toUpperCase())}/>{previous!==undefined&&<ActionButton variant="quiet" disabled={value.toUpperCase()===previous.toUpperCase()} icon={<RotateCcw/>} onClick={()=>commit(previous)} aria-label={`Restaurar ${label}`}>Restaurar</ActionButton>}</div></div>;
}
