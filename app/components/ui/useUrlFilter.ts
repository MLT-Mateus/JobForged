"use client";
import {useEffect,useState,useCallback,type SetStateAction} from 'react';
export function useUrlFilter(key:string,initial=''){
 const [value,setValue]=useState(initial);
 useEffect(()=>{const read=()=>setValue(new URL(location.href).searchParams.get(key)??initial);const timer=setTimeout(read,0);window.addEventListener('popstate',read);return()=>{clearTimeout(timer);window.removeEventListener('popstate',read)}},[key,initial]);
 const update=useCallback((next:SetStateAction<string>)=>{const resolved=typeof next==='function'?next(value):next;setValue(resolved);const url=new URL(location.href);if(resolved&&resolved!==initial)url.searchParams.set(key,resolved);else url.searchParams.delete(key);history.replaceState(history.state,'',url)},[value,key,initial]);
 return [value,update] as const;
}
