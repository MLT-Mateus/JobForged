"use client";
import {ActionButton} from '../ui';
export const administrativeVerificationToastAction = { label:'Confirmar autenticação', href:'/backoffice/seguranca', newTab:true };
export function AdministrativeVerificationAction(){
 return <ActionButton type="button" onClick={()=>window.open('/backoffice/seguranca','_blank','noopener,noreferrer')} title="Abre em outra aba e preserva os campos desta página">Confirmar autenticação</ActionButton>;
}
