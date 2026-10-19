"use client";
import {useEffect,useState} from 'react';
import {CommunicationBanner} from '../ui/CommunicationBanner';
import {ActionButton,InlineNotice} from '../ui';
import type {PlatformBanner} from '@/app/lib/communication-types';
export function PlatformHomeBanners(){
 const [items,setItems]=useState<PlatformBanner[]>([]),[error,setError]=useState(false),[revision,setRevision]=useState(0);
 useEffect(()=>{const c=new AbortController();void fetch('/api/communications?section=banners',{cache:'no-store',signal:c.signal}).then(async r=>{if(!r.ok)throw new Error();return r.json() as Promise<{items:PlatformBanner[]}>}).then(v=>{if(!c.signal.aborted){setItems(v.items);setError(false)}}).catch(()=>{if(!c.signal.aborted)setError(true)});return()=>c.abort()},[revision]);
 if(error)return <InlineNotice>Não foi possível carregar os comunicados. <ActionButton variant="quiet" onClick={()=>setRevision(v=>v+1)}>Tentar novamente</ActionButton></InlineNotice>;
 return <CommunicationBanner items={items.map(b=>({...b,image:`/api/communications/assets/${b.image_id}`}))}/>;
}
