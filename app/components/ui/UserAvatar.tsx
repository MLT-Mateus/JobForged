"use client";
/* Authenticated image endpoint: bypass public image optimizers and use bounded WebP renditions. */
/* eslint-disable @next/next/no-img-element */
import {useState} from 'react';
export function UserAvatar({name,memberId,version=0,large=false}:{name:string;memberId?:string;version?:number;large?:boolean}){
 const src=memberId&&version?`/api/account/photo?member=${encodeURIComponent(memberId)}&size=${large?'profile':'small'}&v=${version}`:null;
 const [failed,setFailed]=useState<string|null>(null);
 return <span className={`jf-user-avatar ${large?'jf-user-avatar--large':''}`} aria-label={`Foto de ${name||'usuário'}`}>{src&&src!==failed?<img src={src} alt="" width={large?96:40} height={large?96:40} loading="lazy" decoding="async" onError={()=>setFailed(src)}/>:<span aria-hidden="true">{name.trim().split(/\s+/).slice(0,2).map(word=>word[0]).join('').toLocaleUpperCase('pt-BR')||'?'}</span>}</span>;
}
