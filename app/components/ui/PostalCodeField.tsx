"use client";
import {useEffect,useRef,useState} from 'react';
import {TextField} from './FormControls';
export type PostalAddress={postalCode:string;street:string;district:string;city:string;state:string};
export function PostalCodeField({value,onValueChange,onAddress,disabled=false,required=false}:{value:string;onValueChange:(value:string)=>void;onAddress:(address:PostalAddress)=>void;disabled?:boolean;required?:boolean}){
 const pending=useRef<AbortController|null>(null),sequence=useRef(0);
 const [message,setMessage]=useState('Digite o CEP para preencher o endereço automaticamente.');
 useEffect(()=>()=>{sequence.current++;pending.current?.abort()},[]);
 async function change(value:string){
  onValueChange(value);pending.current?.abort();const current=++sequence.current,cep=value.replace(/\D/g,'');
  if(cep.length!==8){setMessage('Digite os 8 dígitos do CEP.');return}
  const controller=new AbortController();pending.current=controller;setMessage('Consultando endereço...');
  try{
   const response=await fetch('/api/address?cep='+cep,{signal:controller.signal});
   const data=await response.json() as PostalAddress&{message?:string};
   if(current!==sequence.current)return;
   if(!response.ok)throw Error(data.message||'Consulta indisponível. Preencha o endereço manualmente.');
   onAddress(data);setMessage(data.street&&data.district?'Endereço preenchido. Confira os dados e informe número e complemento.':'Cidade e UF preenchidas. Complete o logradouro, bairro e número.');
  }catch(error){if(current!==sequence.current||controller.signal.aborted)return;setMessage(error instanceof Error?error.message:'Consulta indisponível. Preencha manualmente.')}
 }
 return <div><TextField label="CEP" format="cep" autoComplete="postal-code" value={value} required={required} disabled={disabled} onChange={e=>void change(e.target.value)} placeholder="Digite o CEP..."/><p className="jf-field__help" role="status" aria-live="polite">{message}</p></div>;
}
