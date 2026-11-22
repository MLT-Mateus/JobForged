"use client";
import {useEffect,useRef,useState} from 'react';
import type {PDFDocumentLoadingTask,PDFDocumentProxy,RenderTask} from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {ActionButton} from './AdminPrimitives';
import './pdf-preview.css';

// Render passive pixels/text only. Never execute document actions, embedded
// scripts, annotations or external links. Bytes remain in the current browser.
export function PdfPreview({source,title}:{source:string;title:string}){
 const container=useRef<HTMLDivElement>(null),surface=useRef<HTMLDivElement>(null);
 const [pdf,setPdf]=useState<PDFDocumentProxy|null>(null),[page,setPage]=useState(1),[width,setWidth]=useState(0),[busy,setBusy]=useState(true),[error,setError]=useState(''),[text,setText]=useState('');
 useEffect(()=>{const node=container.current;if(!node)return;const observer=new ResizeObserver(entries=>setWidth(Math.floor(entries[0].contentRect.width)));observer.observe(node);return()=>observer.disconnect()},[]);
 useEffect(()=>{let closed=false,task:PDFDocumentLoadingTask|undefined;const abort=new AbortController();
  void (async()=>{try{const lib=await import('pdfjs-dist');if(closed)return;lib.GlobalWorkerOptions.workerSrc=workerUrl;const response=await fetch(source,{signal:abort.signal});if(!response.ok)throw Error();const data=new Uint8Array(await response.arrayBuffer());if(closed)return;
   task=lib.getDocument({data,enableXfa:false,useSystemFonts:true,verbosity:0,disableWorkerRendering:true,maxImageSize:16000000,canvasMaxAreaInBytes:32000000});
   // Do not leave password-protected files waiting indefinitely for a prompt.
   task.onPassword=()=>{if(!closed){setError('Este PDF exige uma senha. Use Baixar para abri-lo no seu leitor.');setBusy(false)}void task?.destroy()};
   const document=await task.promise;if(!closed)setPdf(document);
  }catch{if(!closed){setError('Não foi possível exibir este PDF. Use Baixar para abrir o arquivo.');setBusy(false)}}})();
  return()=>{closed=true;abort.abort();void task?.destroy()};
 },[source]);
 useEffect(()=>{if(!pdf||!width)return;let closed=false,render:RenderTask|undefined;
  void (async()=>{try{const documentPage=await pdf.getPage(page);if(closed)return;setBusy(true);setError('');const original=documentPage.getViewport({scale:1});const scale=Math.min(width/original.width,2,2400/original.height);const viewport=documentPage.getViewport({scale});const density=Math.min(window.devicePixelRatio||1,2);const canvas=document.createElement('canvas');canvas.width=Math.floor(viewport.width*density);canvas.height=Math.floor(viewport.height*density);canvas.style.width=viewport.width+'px';canvas.style.height=viewport.height+'px';canvas.setAttribute('aria-hidden','true');
   render=documentPage.render({canvas,viewport,transform:density===1?undefined:[density,0,0,density,0,0],annotationMode:0});await render.promise;
   const content=await documentPage.getTextContent();if(closed)return;surface.current?.replaceChildren(canvas);setText(content.items.map(item=>'str' in item?item.str:'').join('\n'));setBusy(false);
  }catch{if(!closed){setError('Esta página não pôde ser exibida. Use Baixar para consultar o documento.');setBusy(false)}}})();
  return()=>{closed=true;render?.cancel()};
 },[pdf,page,width]);
 const change=(next:number)=>{setBusy(true);setText('');setPage(next)};
 return <section className="jf-pdf-preview" aria-label={title}>
  {pdf&&<nav className="jf-pdf-preview__controls" aria-label="Páginas do currículo"><ActionButton variant="secondary" disabled={busy||page<=1} onClick={()=>change(page-1)}>Anterior</ActionButton><span role="status">Página {page} de {pdf.numPages}</span><ActionButton variant="secondary" disabled={busy||page>=pdf.numPages} onClick={()=>change(page+1)}>Próxima</ActionButton></nav>}
  {busy&&<p role="status">Carregando página...</p>}{error&&<p role="alert">{error}</p>}
  <div ref={container} className="jf-pdf-preview__viewport" aria-busy={busy}><div ref={surface} role="img" aria-label={`${title}, página ${page}`} hidden={!!error||busy}/></div>
  {text&&<details><summary>Texto da página</summary><p className="jf-pdf-preview__text">{text}</p></details>}
 </section>;
}
