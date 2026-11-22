"use client";
import {useEffect,useState} from 'react';
import type {CollectionLayout} from './CollectionView';

/** Presentation only; never stores entity data or credentials. */
export function useCollectionPreference(scope:string,initial:CollectionLayout='list'){
 const [value,setValue]=useState<CollectionLayout>(initial);
 useEffect(()=>{
  const timer=setTimeout(()=>{try{const saved=localStorage.getItem('jf:collection:'+scope);if(saved==='list'||saved==='blocks')setValue(saved)}catch{/* Storage is optional. */}},0);
  return()=>clearTimeout(timer);
 },[scope]);
 const change=(next:CollectionLayout)=>{setValue(next);try{localStorage.setItem('jf:collection:'+scope,next)}catch{/* Keep the current session preference. */}};
 return [value,change] as const;
}
