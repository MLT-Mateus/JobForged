"use client";
import {useCallback,useState} from 'react';
import {usePendingChanges} from './PendingChanges';

/** Parent tabs and refresh actions share the dirty state of their nested editors. */
export function useDraftScope(ownDirty=false){
 const [editors,setEditors]=useState<Record<string,boolean>>({});
 const register=useCallback((id:string,dirty:boolean)=>{
  setEditors(current=>current[id]===dirty?current:{...current,[id]:dirty});
  return()=>setEditors(current=>{if(!(id in current))return current;const next={...current};delete next[id];return next});
 },[]);
 const guard=usePendingChanges(ownDirty||Object.values(editors).some(Boolean));
 return {register,...guard};
}
