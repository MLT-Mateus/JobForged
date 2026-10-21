"use client";
import {useState} from 'react';
import {RotateCcw} from 'lucide-react';
import {TextField} from './FormControls';
import {ActionButton} from './AdminPrimitives';
import {FocusPopover} from './Widgets';
function toHsl(hex:string){const [r,g,b]=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255),max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min,l=(max+min)/2;let h=0;if(d)h=(max===r?((g-b)/d)%6:max===g?(b-r)/d+2:(r-g)/d+4)*60;return [Math.round((h+360)%360),Math.round(d?d/(1-Math.abs(2*l-1))*100:0),Math.round(l*100)]}
function toHex(h:number,s:number,l:number){s/=100;l/=100;const a=s*Math.min(l,1-l),f=(n:number)=>{const k=(n+h/30)%12;return Math.round((l-a*Math.max(-1,Math.min(k-3,9-k,1)))*255).toString(16).padStart(2,'0')};return `#${f(0)}${f(8)}${f(4)}`.toUpperCase()}
export function ColorField({label,value,previous,onChange}:{label:string;value:string;previous?:string;onChange:(value:string)=>void}){
 const valid=/^#[0-9A-F]{6}$/i.test(value),[lastValid,setLastValid]=useState(valid?value:'#20B2AA');
 const commit=(next:string)=>{if(/^#[0-9A-F]{6}$/i.test(next))setLastValid(next);else if(valid)setLastValid(value);onChange(next)};
 const color=valid?value:lastValid;
 const [coordinates,setCoordinates]=useState({hex:color,channels:toHsl(color)});
 const hsl=coordinates.hex===color?coordinates.channels:toHsl(color);
 const panel=<FocusPopover label={`Selecionar ${label}`} triggerVariant="quiet" triggerClassName="jf-input-action" triggerContent={<span className="jf-color-field__swatch" style={{background:color}} aria-hidden="true"/>}><div className="jf-color-field__sample" style={{background:color}} aria-label={`Cor selecionada ${color}`}/>{['Matiz','Saturação','Luminosidade'].map((name,i)=><TextField key={name} label={`${name}: ${hsl[i]}${i?'%':'°'}`} type="range" min={0} max={i?100:359} step={1} value={hsl[i]} onChange={e=>{const next=[...hsl];next[i]=Number(e.target.value);const hex=toHex(next[0],next[1],next[2]);setCoordinates({hex,channels:next});commit(hex)}}/>)}</FocusPopover>;
 return <div className="jf-color-field"><TextField label={label} value={value} placeholder="#RRGGBB" maxLength={7} spellCheck={false} autoComplete="off" onChange={e=>commit(e.target.value.toUpperCase())} error={valid?undefined:"Use seis dígitos no formato #RRGGBB."} startAdornment={panel} endAdornment={<>{previous!==undefined&&<ActionButton type="button" variant="quiet" className="jf-input-action" disabled={value.toUpperCase()===previous.toUpperCase()} icon={<RotateCcw/>} onClick={()=>commit(previous)} aria-label={`Restaurar ${label}`}/>}</>}/></div>;
}
