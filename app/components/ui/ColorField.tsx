"use client";
import {RotateCcw} from 'lucide-react';
import {TextField} from './FormControls';
import {ActionButton} from './AdminPrimitives';
/** One text control for hexadecimal values, with the native color picker as an adornment. */
export function ColorField({label,value,previous,onChange}:{label:string;value:string;previous?:string;onChange:(value:string)=>void}){
 const valid=/^#[0-9A-F]{6}$/i.test(value);
 return <TextField label={label} value={value} placeholder="#RRGGBB" maxLength={7} onChange={e=>onChange(e.target.value.toUpperCase())} error={valid?undefined:"Use o formato hexadecimal #RRGGBB."} endAdornment={<><input type="color" value={valid?value:"#000000"} aria-label={`Selecionar ${label}`} onChange={e=>onChange(e.target.value.toUpperCase())}/>{previous!==undefined&&<ActionButton variant="quiet" onClick={()=>onChange(previous)} aria-label={`Restaurar ${label}`}><RotateCcw/></ActionButton>}</>}/>;
}
