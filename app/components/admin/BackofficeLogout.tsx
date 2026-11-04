"use client";
import {useState} from 'react';
import {LogOut} from 'lucide-react';
import {ActionButton,AppToast} from '../ui';
export function BackofficeLogout(){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function logout(){setBusy(true);setError('');try{
  const response=await fetch('/api/auth/sign-out',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:'{}'});
  // Server clears local cookies even when provider revocation cannot be confirmed.
  if(response.ok||response.status===503){window.location.replace('/login');return}
  throw Error();
 }catch{setError('Não foi possível encerrar a sessão. Confira sua conexão e tente novamente.');setBusy(false)}}
 return <><ActionButton variant="secondary" disabled={busy} onClick={()=>void logout()}><LogOut size={16}/>{busy?'Saindo...':'Sair da conta'}</ActionButton>{error&&<AppToast notice={{kind:'danger',title:'Sessão não encerrada',text:error}} onClose={()=>setError('')}/>}</>;
}
