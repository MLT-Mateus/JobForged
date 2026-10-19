"use client";
import {useCallback,useEffect,useState} from 'react';
import {Bell} from 'lucide-react';
import {ActionButton,StatusBadge,WidgetDialog,NotificationPanel} from '../ui';
import type {InboxItem} from '@/app/lib/communication-types';
import '../ui/communications.css';
export function NotificationBell(){
 const [open,setOpen]=useState(false),[page,setPage]=useState(1),[data,setData]=useState<{items:InboxItem[];unread:number}|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const load=useCallback(async()=>{try{const r=await fetch(`/api/communications?page=${page}`,{cache:'no-store'});if(!r.ok)throw new Error();const v=await r.json() as {items:InboxItem[];unread:number};setData(v);setError('')}catch{setError('Não foi possível carregar seus alertas.')}},[page]);
 useEffect(()=>{const c=new AbortController();void fetch(`/api/communications?page=${page}`,{cache:'no-store',signal:c.signal}).then(async r=>{if(!r.ok)throw new Error();return r.json() as Promise<{items:InboxItem[];unread:number}>}).then(v=>{if(!c.signal.aborted){setData(v);setError('')}}).catch(()=>{if(!c.signal.aborted)setError('Não foi possível carregar seus alertas.')});const update=()=>void load();window.addEventListener('focus',update);const timer=setInterval(update,60000);return()=>{c.abort();window.removeEventListener('focus',update);clearInterval(timer)}},[load,page]);
 async function read(id:string){if(busy)return;setBusy(true);try{const r=await fetch('/api/communications',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});if(!r.ok)throw new Error();await load()}catch{setError('Não foi possível marcar o alerta como lido.')}finally{setBusy(false)}}
 return <><ActionButton variant="quiet" aria-label={`Alertas${data?.unread?` · ${data.unread} não lidos`:''}`} title="Alertas" onClick={()=>{setOpen(true);void load()}}><Bell/>{!!data?.unread&&<StatusBadge tone="info">{data.unread>99?'99+':data.unread}</StatusBadge>}</ActionButton><WidgetDialog open={open} onClose={()=>setOpen(false)} title="Alertas" description="Comunicados da JobForged para sua conta." kind="drawer"><NotificationPanel items={data?.items??null} error={error} page={page} busy={busy} onRetry={()=>void load()} onRead={id=>void read(id)} onPage={setPage}/></WidgetDialog></>;
}
