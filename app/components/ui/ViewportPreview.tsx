"use client";
import {Component,useCallback,useEffect,useRef,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import './widgets.css';
import {ActionButton} from './AdminPrimitives';
import {WorkspaceState} from './WorkspacePatterns';
class PreviewBoundary extends Component<{children:ReactNode},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true}}
 componentDidCatch(){console.error('[JobForged] preview-render-failed')}
 render(){return this.state.failed?<WorkspaceState kind="error" title="Não foi possível exibir a prévia" description="Suas alterações continuam no editor." action={<ActionButton onClick={()=>this.setState({failed:false})}>Tentar novamente</ActionButton>}/>:this.props.children}
}

const documentSource='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'none\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\' https: data:; font-src \'self\' data:; form-action \'none\'; base-uri \'none\'"></head><body style="margin:0"><div id="preview-root"></div></body></html>';
/** A real viewport, scaled to its available space without changing breakpoints. */
export function ViewportPreview({children,width,height=800,theme,title='Prévia da página'}:{children:ReactNode;width:number;height?:number;theme:'light'|'dark';title?:string}){
 const container=useRef<HTMLDivElement>(null),frame=useRef<HTMLIFrameElement>(null);
 const [doc,setDoc]=useState<Document|null>(null),[scale,setScale]=useState(1);
 const ready=useCallback(()=>{const current=frame.current?.contentDocument;if(current?.getElementById("preview-root"))setDoc(current)},[]);
 useEffect(()=>{ready();const element=frame.current;element?.addEventListener("load",ready);return()=>element?.removeEventListener("load",ready)},[ready]);
 useEffect(()=>{const element=container.current;if(!element)return;const resize=()=>setScale(Math.min(1,Math.max(0,element.clientWidth)/width,Math.max(280,Math.min(640,window.innerHeight-240))/height));resize();const observer=new ResizeObserver(resize);observer.observe(element);window.addEventListener('resize',resize);return()=>{observer.disconnect();window.removeEventListener('resize',resize)}},[width,height]);
 useEffect(()=>{
  if(!doc)return;
  const copies=new Map<Element,{signature:string;clone:HTMLElement}>();let pending=0;
  const syncStyles=()=>{pending=0;const sources=Array.from(document.head.querySelectorAll('link[rel="stylesheet"],style'));const active=new Set(sources);
   for(const [source,{clone}] of copies)if(!active.has(source)){clone.remove();copies.delete(source)}
   for(const source of sources){const signature=source.outerHTML,existing=copies.get(source);if(existing?.signature===signature)continue;
    const clone=source.cloneNode(true) as HTMLElement;clone.setAttribute('data-preview-style','');if(existing)existing.clone.replaceWith(clone);else doc.head.appendChild(clone);copies.set(source,{signature,clone});
   }
  };
  const schedule=()=>{if(!pending)pending=requestAnimationFrame(syncStyles)};
  syncStyles();const observer=new MutationObserver(schedule);observer.observe(document.head,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['href','media','disabled']});
  const navigate=(event:MouseEvent)=>{const target=event.target as HTMLElement;const link=target.closest?.('a');if(link){event.preventDefault();const href=link.getAttribute('href')||'';if(href.startsWith('#')){const target=doc.getElementById(href.slice(1));const view=doc.defaultView;if(target&&view)view.scrollTo({top:target.getBoundingClientRect().top+view.scrollY,behavior:'auto'})}}};
  doc.addEventListener('click',navigate,true);return()=>{observer.disconnect();cancelAnimationFrame(pending);for(const {clone} of copies.values())clone.remove();doc.removeEventListener('click',navigate,true)};
 },[doc]);
 useEffect(()=>{if(doc){doc.documentElement.setAttribute('data-theme',theme);doc.documentElement.style.setProperty('color-scheme',theme)}},[doc,theme]);
 const root=doc?.getElementById('preview-root');
 return <div className="jf-viewport-preview"><p className="jf-viewport-preview__scale">{width} × {height} px · {Math.round(scale*100)}%</p><div ref={container} className="jf-viewport-preview__available"><div className="jf-viewport-preview__stage" style={{height:height*scale,width:width*scale}}><iframe ref={frame} title={title} sandbox="allow-same-origin" srcDoc={documentSource} onLoad={ready} style={{width,height,transform:`scale(${scale})`}}/>{root&&createPortal(<PreviewBoundary>{children}</PreviewBoundary>,root)}</div></div><p className="jf-viewport-preview__hint">Role dentro da prévia para conferir a página. Links externos ficam desativados.</p></div>;
}
