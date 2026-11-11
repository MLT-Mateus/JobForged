"use client";
import {useState} from 'react';
import {ActionButton,FileUploadField,InlineNotice,UserAvatar} from '../ui';
import {imageUploadOptions} from '@/shared/image-upload';
const accept='.png,.jpg,.jpeg,.webp,.avif,image/png,image/jpeg,image/webp,image/avif';
export function ProfilePhoto({name,memberId,version,onSaved}:{name:string;memberId?:string;version?:number;onSaved:(value:{memberId:string;photoVersion:number})=>void}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function save(file:File|null,remove=false){if(!file&&!remove)return;setBusy(true);setError('');try{
  const response=await fetch('/api/account/photo',remove?{method:'DELETE',credentials:'same-origin'}:imageUploadOptions(file!));
  const result=await response.json() as {memberId:string;photoVersion:number;message?:string};if(!response.ok)throw Error(result.message||'Não foi possível salvar.');onSaved(result);
 }catch(cause){setError(cause instanceof Error?cause.message:'Não foi possível salvar.')}finally{setBusy(false)}}
 return <div className="jf-profile-photo"><UserAvatar name={name} memberId={memberId} version={version} large/><div className="jf-workspace-stack"><FileUploadField label="Foto de perfil" accept={accept} maxBytes={2097152} value={null} disabled={busy} emptyHint={busy?'Enviando...':'PNG, JPEG, WebP ou AVIF · até 2 MB'} helpText="Recorte quadrado automático. A foto é otimizada para web e os metadados são removidos." onFileChange={file=>void save(file)}/>{!!version&&<ActionButton variant="quiet" disabled={busy} onClick={()=>void save(null,true)}>Remover foto</ActionButton>}{error&&<InlineNotice tone="danger">{error}</InlineNotice>}</div></div>;
}
