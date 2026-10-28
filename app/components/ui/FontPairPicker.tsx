"use client";
import {ActionButton} from './AdminPrimitives';
import {fontPairs,type FontPairId} from './font-pairs';
export function FontPairPicker({value,onChange}:{value:FontPairId;onChange:(value:FontPairId)=>void}){return <div className="jf-font-pairs" role="group" aria-label="Pares tipográficos">{fontPairs.map(pair=><ActionButton key={pair.id} variant="secondary" aria-pressed={value===pair.id} onClick={()=>onChange(pair.id)}><strong>{pair.label}</strong><span className="jf-font-pairs__heading" style={{fontFamily:pair.heading}}>Faça parte da nossa equipe</span><span style={{fontFamily:pair.body}}>Encontre sua próxima oportunidade.</span><small>{pair.headingName} + {pair.bodyName}</small></ActionButton>)}</div>}
