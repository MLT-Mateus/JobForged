"use client";
import {useState, type PointerEvent, type KeyboardEvent, type CSSProperties} from 'react';
import {RotateCcw} from 'lucide-react';
import {TextField} from './FormControls';
import {ActionButton} from './AdminPrimitives';
import {FocusPopover} from './Widgets';
const validHex=(value:string)=>/^#[0-9A-F]{6}$/i.test(value);
function toHsv(hex:string){
 const [r,g,b]=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255),max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;
 let h=0;if(d)h=(max===r?((g-b)/d)%6:max===g?(b-r)/d+2:(r-g)/d+4)*60;
 return [(h+360)%360,max?d/max*100:0,max*100];
}
function toHex(h:number,s:number,v:number){
 s/=100;v/=100;const f=(n:number)=>{const k=(n+h/60)%6;return Math.round((v-v*s*Math.max(0,Math.min(k,4-k,1)))*255).toString(16).padStart(2,'0')};
 return `#${f(5)}${f(3)}${f(1)}`.toUpperCase();
}
const clamp=(n:number)=>Math.max(0,Math.min(100,n));
export function ColorField({label,value,previous,onChange,name}:{name?:string;label:string;value:string;previous?:string;onChange:(value:string)=>void}){
 const valid=validHex(value),[lastValid,setLastValid]=useState(valid?value:'#20B2AA');
 const commit=(next:string)=>{if(validHex(next))setLastValid(next);else if(valid)setLastValid(value);onChange(next)};
 const color=valid?value:lastValid;
 const [coordinates,setCoordinates]=useState({hex:color,channels:toHsv(color)});
 const hsv=coordinates.hex===color?coordinates.channels:toHsv(color);
 function select(next:number[]){const hex=toHex(next[0],next[1],next[2]);setCoordinates({hex,channels:next});commit(hex)}
 function point(e:PointerEvent<HTMLDivElement>){const rect=e.currentTarget.getBoundingClientRect();select([hsv[0],clamp((e.clientX-rect.left)/rect.width*100),clamp(100-(e.clientY-rect.top)/rect.height*100)])}
 function key(e:KeyboardEvent<HTMLDivElement>){
  const next=[...hsv],step=e.shiftKey?10:1;
  switch(e.key){case 'ArrowLeft':next[1]-=step;break;case 'ArrowRight':next[1]+=step;break;case 'ArrowUp':next[2]+=step;break;case 'ArrowDown':next[2]-=step;break;case 'Home':next[1]=0;break;case 'End':next[1]=100;break;default:return}
  e.preventDefault();next[1]=clamp(next[1]);next[2]=clamp(next[2]);select(next);
 }
 const panel=<FocusPopover label={`Selecionar ${label}`} triggerVariant="quiet" triggerClassName="jf-input-action" triggerContent={<span className="jf-color-field__swatch" style={{background:color}} aria-hidden="true"/>}>
  <div className="jf-color-palette" style={{backgroundColor:`hsl(${hsv[0]} 100% 50%)`}} role="slider" tabIndex={0} aria-label={`Saturação e brilho de ${label}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(hsv[1])} aria-valuetext={`Saturação ${Math.round(hsv[1])}%, brilho ${Math.round(hsv[2])}%. Setas horizontais ajustam saturação; verticais, brilho.`} onKeyDown={key} onPointerDown={e=>{e.preventDefault();e.currentTarget.focus();e.currentTarget.setPointerCapture(e.pointerId);point(e)}} onPointerMove={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))point(e)}} onPointerUp={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId)}}>
   <span className="jf-color-palette__cursor" style={{left:`${hsv[1]}%`,top:`${100-hsv[2]}%`,background:color}}/>
  </div>
  <label className="jf-color-hue"><span>Matiz</span><input type="range" min={0} max={359} step={1} value={Math.round(hsv[0])} aria-label={`Matiz de ${label}`} style={{'--jf-color-hue':`hsl(${hsv[0]} 100% 50%)`} as CSSProperties} onChange={e=>select([Number(e.target.value),hsv[1],hsv[2]])}/></label>
  <div className="jf-color-selection"><span style={{background:color}} aria-hidden="true"/><output aria-label="Cor selecionada">{color.toUpperCase()}</output></div>
 </FocusPopover>;
 return <div className="jf-color-field"><TextField name={name} label={label} value={value} placeholder="Digite a cor..." maxLength={7} spellCheck={false} autoComplete="off" onChange={e=>commit(e.target.value.toUpperCase())} error={valid?undefined:"Use seis dígitos no formato #RRGGBB."} startAdornment={panel} endAdornment={<>{previous!==undefined&&<ActionButton type="button" variant="quiet" className="jf-input-action" disabled={value.toUpperCase()===previous.toUpperCase()} icon={<RotateCcw/>} onClick={()=>commit(previous)} aria-label={`Restaurar ${label}`}/>}</>}/></div>;
}
