"use client";
import {useRef,useState,type FormEvent} from 'react';
import {ActionButton,AppToast,EditorAccordion,TextField} from '../components/ui';
import {FieldFeedback,revealField} from '../components/ui/FieldFeedback';
export function ValidationDemo(){
 const form=useRef<HTMLFormElement>(null);const [errors,setErrors]=useState<Record<string,string>>({}),[notice,setNotice]=useState('');
 function validate(event:FormEvent){event.preventDefault();const input=form.current?.querySelector<HTMLInputElement>('[name="example.email"]');if(!input||!form.current)return;
  if(!input.validity.valid){const message=input.validity.valueMissing?'Preencha o e-mail.':'Informe um e-mail válido.';setErrors({'example.email':message});setNotice(message);revealField(form.current,input)}else{setErrors({});setNotice('')}
 }
 return <div className="ds-modern-stack"><p>Ao salvar: destaque o campo, explique o erro, abra a seção e leve o foco até ele. Preserve os dados e respeite as preferências de som e movimento.</p><FieldFeedback errors={errors}><form ref={form} noValidate onSubmit={validate} className="ds-modern-stack"><TextField label="Nome da visualização" defaultValue="Meu exemplo"/><EditorAccordion title="Dados de contato"><TextField name="example.email" label="E-mail de contato" type="email" required onChange={()=>setErrors({})}/></EditorAccordion><ActionButton type="submit">Validar exemplo</ActionButton></form></FieldFeedback>{notice&&<AppToast notice={{kind:'danger',title:'Revise o preenchimento',text:notice}} onClose={()=>setNotice('')}/>}</div>;
}
