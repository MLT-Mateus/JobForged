"use client";
import {useEffect,useRef,useState} from 'react';
export function useVoiceCapture(onAudio:(file:File)=>void,onError:(message:string)=>void){
 const [recording,setRecording]=useState(false),[requesting,setRequesting]=useState(false),[seconds,setSeconds]=useState(0);
 const recorder=useRef<MediaRecorder|null>(null),stream=useRef<MediaStream|null>(null),timer=useRef<ReturnType<typeof setInterval>|null>(null),generation=useRef(0),callback=useRef(onAudio),errors=useRef(onError);
 useEffect(()=>{callback.current=onAudio;errors.current=onError},[onAudio,onError]);
 const clear=()=>{if(timer.current)clearInterval(timer.current);timer.current=null;stream.current?.getTracks().forEach(t=>t.stop());stream.current=null};
 function cancel(){generation.current++;if(recorder.current){recorder.current.onstop=null;if(recorder.current.state!=='inactive')recorder.current.stop()}clear();setRecording(false);setRequesting(false);setSeconds(0)}
 useEffect(()=>()=>{generation.current++;if(recorder.current){recorder.current.onstop=null;if(recorder.current.state!=='inactive')recorder.current.stop()}if(timer.current)clearInterval(timer.current);stream.current?.getTracks().forEach(t=>t.stop())},[]);
 async function start(){if(recording||requesting)return;const version=++generation.current;setRequesting(true);
  try{if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined')throw Error('Este navegador não permite gravar áudio. Você pode anexar um áudio ou digitar.');
   const mic=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});
   if(version!==generation.current){mic.getTracks().forEach(t=>t.stop());return}stream.current=mic;
   const mime=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus'].find(t=>MediaRecorder.isTypeSupported(t));if(!mime)throw Error('Formato de gravação incompatível. Anexe um áudio ou digite.');
   const rec=new MediaRecorder(mic,{mimeType:mime,audioBitsPerSecond:32000}),chunks:BlobPart[]=[];let size=0,elapsed=0;
   recorder.current=rec;rec.ondataavailable=e=>{if(e.data.size){chunks.push(e.data);size+=e.data.size;if(size>2*1024*1024&&rec.state==='recording')rec.stop()}};
   rec.onerror=()=>{cancel();errors.current('A gravação foi interrompida. Verifique o microfone e tente novamente.')};
   rec.onstop=()=>{clear();setRecording(false);if(version!==generation.current)return;const type=mime.split(';')[0];const blob=new Blob(chunks,{type});if(blob.size>2*1024*1024){errors.current('O áudio ultrapassou 2 MB. Grave uma mensagem menor.');return}if(blob.size<100){errors.current('Não foi possível captar o áudio. Tente novamente.');return}callback.current(new File([blob],'Mensagem de voz.'+(type==='audio/mp4'?'m4a':type==='audio/ogg'?'ogg':'webm'),{type}))};
   rec.start(500);setRecording(true);setSeconds(0);timer.current=setInterval(()=>{elapsed++;setSeconds(elapsed);if(elapsed>=90&&rec.state==='recording')rec.stop()},1000);
  }catch(e){clear();if(version===generation.current)onError(e instanceof Error&&e.name==='NotAllowedError'?'Permita o microfone no navegador para gravar.':e instanceof Error?e.message:'Não foi possível acessar o microfone.')}
  finally{if(version===generation.current)setRequesting(false)}
 }
 return {recording,requesting,seconds,start,stop:()=>{if(recorder.current?.state==='recording')recorder.current.stop()},cancel};
}
