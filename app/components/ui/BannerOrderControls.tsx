"use client";
import {ArrowUp,ArrowDown,Eye,EyeOff} from 'lucide-react';
import {ActionButton,StatusBadge} from './AdminPrimitives';
import {SelectField} from './FormControls';
export function BannerVisibility({visible}:{visible:boolean}){const Icon=visible?Eye:EyeOff;return <StatusBadge tone={visible?'positive':'neutral'}><Icon size={13} aria-hidden="true"/>{visible?'Visível':'Oculto'}</StatusBadge>}
export function BannerOrderControls({index,count,onMove}:{index:number;count:number;onMove:(position:number)=>void}){return <div className="jf-banner-order"><SelectField label="Posição na sequência" value={String(index)} onValueChange={value=>onMove(Number(value))} options={Array.from({length:count},(_,i)=>({value:String(i),label:`${i+1} de ${count}${i===0?' · Primeiro':''}`}))}/><div className="jf-banner-order__arrows"><ActionButton variant="secondary" aria-label="Mover banner para cima" disabled={index===0} onClick={()=>onMove(index-1)}><ArrowUp size={16}/></ActionButton><ActionButton variant="secondary" aria-label="Mover banner para baixo" disabled={index===count-1} onClick={()=>onMove(index+1)}><ArrowDown size={16}/></ActionButton></div></div>}
