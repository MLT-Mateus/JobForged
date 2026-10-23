import type {ReactNode} from 'react';
export type ValueState='ready'|'loading'|'unavailable';
function hasValue(value:ReactNode):boolean{if(value===null||value===undefined||typeof value==='boolean')return false;if(typeof value==='string')return value.trim().length>0;if(typeof value==='number')return Number.isFinite(value);if(Array.isArray(value))return value.some(hasValue);return true}
/** A missing value is not zero. Keep loading, absence and unavailability distinct. */
export function DisplayValue({value,state='ready',emptyText='Não informado'}:{value:ReactNode;state?:ValueState;emptyText?:string}){return <span className="jf-display-value" aria-live={state==='loading'?'polite':undefined}>{state==='loading'?'Carregando...':state==='unavailable'?'Indisponível':hasValue(value)?value:emptyText.trim()||'Não informado'}</span>}
