"use client";
import {useEffect,useState} from 'react';
import type {CollectionLayout} from './CollectionView';

/** Presentation only; never stores entity data or credentials. */
export function useCollectionPreference(scope:string,initial:CollectionLayout='list'){
 const [value,setValue]=useState<CollectionLayout>(initial);
 useEffect(()=>{
  const timer=setTimeout(()=>{try{const saved=new URL(location.href).searchParams.get('view')||localStorage.getItem('jf:collection:'+location.pathname+':'+scope);if(saved==='list'||saved==='blocks'||initial==='board'&&saved==='board')setValue(saved)}catch{/* Storage is optional. */}},0);
  return()=>clearTimeout(timer);
 },[scope,initial]);
 const change=(next:CollectionLayout)=>{setValue(next);try{localStorage.setItem('jf:collection:'+location.pathname+':'+scope,next);const url=new URL(location.href);url.searchParams.set('view',next);history.replaceState(history.state,'',url)}catch{/* Keep the current session preference. */}};
 return [value,change] as const;
}
