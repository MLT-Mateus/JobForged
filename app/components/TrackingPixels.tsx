"use client";
import {useEffect,useState} from 'react';
import {usePathname} from 'next/navigation';
import {ActionButton} from './ui';
const noTags:string[]=[];
export function TrackingPixels(){
 const path=usePathname();
 const [configuration,setConfiguration]=useState<{path:string;tags:string[]}>({path:"",tags:[]});
 const tags=configuration.path===path?configuration.tags:noTags;
 const [consent,setConsent]=useState<string|null>(null);

 useEffect(()=>{
  const controller=new AbortController();
  void fetch('/api/tracking?url='+encodeURIComponent(location.origin+path),{signal:controller.signal}).then(r=>r.json()).then(value=>{try{setConsent(localStorage.getItem('jf-marketing-consent'))}catch{}setConfiguration({path,tags:Array.isArray(value)?value.filter(id=>/^AW-[0-9]{6,20}$/.test(id)):[]})}).catch(()=>{});
  return()=>controller.abort();
 },[path]);
 useEffect(()=>{
  if(consent!=='accepted'||!tags.length)return;
  const frame=document.createElement('iframe');
  frame.hidden=true;frame.title='Medição de campanha';frame.setAttribute('sandbox','allow-scripts allow-same-origin');
  // Isolate tags from application DOM and expose only the configured page location.
  const locationValue=JSON.stringify(location.origin+path).replace(/</g,'\\u003c');
  frame.srcdoc=`<!doctype html><html><head><script async src="https://www.googletagmanager.com/gtag/js?id=${tags[0]}"></script><script>window.dataLayer=[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());${tags.map(id=>`gtag('config',${JSON.stringify(id)},{page_location:${locationValue},send_page_view:true});`).join('')}</script></head><body></body></html>`;
  document.body.appendChild(frame);
  return()=>{frame.remove()};
 },[tags,consent,path]);
 function choose(value:string){setConsent(value);try{localStorage.setItem('jf-marketing-consent',value)}catch{}}
 if(!tags.length)return null;
 if(consent)return <button className="tracking-preferences" onClick={()=>choose('')}>Preferências de privacidade</button>;
 return <aside className="tracking-consent" aria-label="Preferências de medição"><p>Podemos usar o Google Ads para medir campanhas nesta página?</p><div><ActionButton onClick={()=>choose('accepted')}>Aceitar</ActionButton><ActionButton variant="secondary" onClick={()=>choose('rejected')}>Recusar</ActionButton></div></aside>;
}




