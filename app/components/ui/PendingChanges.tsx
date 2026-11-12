"use client";
import {useEffect,useState} from 'react';
import {ActionButton} from './AdminPrimitives';
import {WidgetDialog} from './Widgets';

export function usePendingChanges(dirty:boolean){
 const [pending,setPending]=useState<null|(()=>void)>(null);
 function confirm(action:()=>void){if(dirty)setPending(()=>action);else action()}
 useEffect(()=>{
  if(!dirty)return;
  const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue=''};
  const click=(event:MouseEvent)=>{
   if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
   const link=(event.target as Element|null)?.closest?.('a[href]') as HTMLAnchorElement|null;
   if(!link||link.download||(link.target&&link.target!=='_self'))return;
   const to=new URL(link.href);
   if(to.origin!==location.origin||to.pathname===location.pathname&&to.search===location.search)return;
   event.preventDefault();event.stopPropagation();
   setPending(()=>()=>{window.removeEventListener('beforeunload',warn);location.assign(to.href)});
  };
  const navigation=(window as Window & {navigation?:EventTarget}).navigation;
  const traverse=(event:Event)=>{
   const intent=event as Event & {navigationType:string;destination:{key:string;url:string}};
   if(!event.cancelable||intent.navigationType!=='traverse'||intent.destination.url===location.href)return;
   event.preventDefault();
   setPending(()=>()=>{window.removeEventListener('beforeunload',warn);navigation?.removeEventListener('navigate',traverse);
    (navigation as EventTarget & {traverseTo:(key:string)=>void}).traverseTo(intent.destination.key)});
  };
  window.addEventListener('beforeunload',warn);
  document.addEventListener('click',click,true);
  navigation?.addEventListener('navigate',traverse);
  return()=>{window.removeEventListener('beforeunload',warn);document.removeEventListener('click',click,true);navigation?.removeEventListener('navigate',traverse)};
 },[dirty]);
 const dialog=<WidgetDialog open={!!pending} onClose={()=>setPending(null)} title="Alterações pendentes" description="Volte para salvar suas alterações ou continue sem salvar agora." footer={<><ActionButton variant="secondary" onClick={()=>setPending(null)}>Voltar ao editor</ActionButton><ActionButton onClick={()=>{setPending(null);pending?.()}}>Continuar sem salvar</ActionButton></>}>{null}</WidgetDialog>;
 return {confirm,dialog};
}
