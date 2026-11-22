"use client";
import {useEffect,useState} from 'react';
import {collectionReturn} from '@/shared/collection-location.mjs';
/** Keep an explicit collection context through detail/edit/preview without storing entity data. */
export function useCollectionNavigation(base:string){
 const [ready,setReady]=useState(false);
 useEffect(()=>{const timer=setTimeout(()=>setReady(true),0);return()=>clearTimeout(timer)},[]);
 const returnHref=ready?(location.pathname===base?location.pathname+location.search:collectionReturn(new URLSearchParams(location.search).get('returnTo'),base)):base;
 const withReturn=(path:string)=>{const url=new URL(path,'https://jobforged.invalid');url.searchParams.set('returnTo',returnHref);return url.pathname+url.search};
 return {returnHref,withReturn};
}
