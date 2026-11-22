"use client";
import type {ReactNode} from 'react';
import {ActionButton} from './AdminPrimitives';

/** A single action order and status area for every unit of persistence. */
export function FormActions({onCancel,onSave,children,dirty=true,busy=false,disabled=false,saveLabel='Salvar',saveVariant='primary',cancelLabel='Descartar',status,form}:{onCancel?:()=>void;onSave?:()=>void;children?:ReactNode;dirty?:boolean;busy?:boolean;disabled?:boolean;saveLabel?:string;saveVariant?:'primary'|'danger';cancelLabel?:string;status?:ReactNode;form?:string}){
 return <footer className="jf-form-actions">
  {status&&<div className="jf-form-actions__status" role="status">{status}</div>}
  <div className="jf-form-actions__buttons">{children}{onCancel&&<ActionButton type="button" variant="secondary" disabled={busy||(!dirty&&cancelLabel==='Descartar')} onClick={onCancel}>{cancelLabel}</ActionButton>}<ActionButton variant={saveVariant} type={onSave?'button':'submit'} form={form} disabled={busy||disabled||!dirty} onClick={onSave}>{busy?'Salvando...':saveLabel}</ActionButton></div>
 </footer>;
}
