"use client";
import {useState} from 'react';
import {PostalCodeField} from './PostalCodeField';
import {TextField} from './FormControls';
export function AddressLookupExample(){
 const [value,setValue]=useState({postalCode:'',street:'',district:'',city:'',state:''});
 return <div className="jf-workspace-stack"><PostalCodeField value={value.postalCode} onValueChange={postalCode=>setValue(v=>({...v,postalCode}))} onAddress={address=>setValue(v=>v.postalCode.replace(/\D/g,'')===address.postalCode?{...v,...address}:v)}/>{(['street','district','city','state'] as const).map((key,i)=><TextField key={key} label={['Logradouro','Bairro','Cidade','UF'][i]} value={value[key]} onChange={e=>setValue(v=>({...v,[key]:e.target.value}))}/>)}</div>;
}
