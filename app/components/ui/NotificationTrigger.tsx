"use client";
import {Bell,LogIn} from 'lucide-react';
import {ActionButton} from './AdminPrimitives';
import './communications.css';
export function NotificationTrigger({authenticated,unread=0,busy=false,onClick}:{authenticated:boolean;unread?:number;busy?:boolean;onClick:()=>void}){
 const count=Number.isSafeInteger(unread)&&unread>0?unread:0;
 return <ActionButton className="jf-notification-trigger" data-authenticated={authenticated} variant="secondary" disabled={busy} onClick={onClick} icon={authenticated?<Bell/>:<LogIn/>} aria-label={authenticated?`Minhas notificações${count?` · ${count} não lidas`:''}`:'Entrar'}><span className="jf-notification-trigger__label">{busy?'Carregando...':authenticated?'Minhas notificações':'Entrar'}</span>{authenticated&&count>0&&<span className="jf-notification-count" aria-hidden="true">{count>99?'99+':count}</span>}</ActionButton>;
}
