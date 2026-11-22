"use client";
import {useState} from 'react';
import {Mic,Paperclip,Send} from 'lucide-react';
import {ActionButton,ChatComposer,DisplayValue,TextField} from '../components/ui';
import {fieldPlaceholder} from '../components/ui/field-copy';
import {AddressLookupExample} from '../components/ui/AddressLookupExample';
import {ValidationDemo} from './ValidationDemo';
import {ItemListDemo} from './ItemListDemo';
import './form-input-guide.css';
export function FormInputGuide(){
 const [message,setMessage]=useState('');
 return <div className="ds-input-guide">
  <div className="ds-input-guide__overview">
   <section className="ds-input-guide__card" aria-labelledby="ds-placeholder-title">
    <h3 id="ds-placeholder-title">Placeholder: verbo + dado + ...</h3>
    <p>Use 2–4 palavras e prefira até 28 caracteres, antes dos três pontos.</p>
    <div className="ds-input-guide__examples"><code>Digite o nome...</code><code>Selecione opções...</code><code>Busque uma vaga...</code></div>
    <TextField label="Nome completo" required helpText="Informe nome e sobrenome."/>
    <ul><li><strong>Label:</strong> identifica o campo e permanece visível.</li><li><strong>Placeholder:</strong> orienta enquanto o campo está vazio.</li><li><strong>Ajuda:</strong> informa formato, limites e requisitos.</li></ul>
    <p>O <strong className="ds-input-guide__required">*</strong> fica no label de campos obrigatórios. Valores preenchidos não recebem reticências.</p>
   </section>
   <section className="ds-input-guide__card" aria-labelledby="ds-composer-title">
    <h3 id="ds-composer-title">Input de chat</h3>
    <p>Campo de mensagem com ações agrupadas, sem a área da conversa.</p>
    <label className="jf-field__label" htmlFor="ds-composer-message">Mensagem</label>
    <ChatComposer><textarea id="ds-composer-message" aria-describedby="ds-composer-help" rows={3} value={message} onChange={e=>setMessage(e.target.value)} placeholder={fieldPlaceholder({label:'Mensagem',placeholder:'Escreva sua mensagem'})}/><footer><div><ActionButton type="button" variant="quiet" disabled aria-label="Anexar arquivo (demonstração)"><Paperclip size={18}/></ActionButton><ActionButton type="button" variant="quiet" disabled aria-label="Gravar áudio (demonstração)"><Mic size={18}/></ActionButton></div><ActionButton type="button" disabled aria-label="Enviar mensagem (demonstração)"><Send size={18}/></ActionButton></footer></ChatComposer>
    <p id="ds-composer-help">Digite para testar o campo. Anexo, áudio e envio são apenas exemplos visuais.</p>
    <p>Placeholder curto, ações com nome acessível e mensagem preservada durante a edição.</p>
   </section>
  </div>
  <div className="ds-input-guide__details">
   <details><summary>Máscaras e formatos <span>Exemplos de preenchimento</span></summary><div className="ds-input-guide__content"><p>A máscara orienta a digitação; a validação confirma o dado. Senhas e textos livres mantêm o conteúdo original.</p><div className="ds-modern-field-grid"><TextField format="cnpj" label="CNPJ" helpText="14 dígitos; pontuação automática."/><TextField format="cnpj-alpha" label="CNPJ alfanumérico"/><TextField format="phone" label="Telefone com DDD" helpText="10 ou 11 dígitos."/><TextField format="otp" label="Código do autenticador" helpText="6 dígitos."/><AddressLookupExample/><ItemListDemo/></div></div></details>
   <details><summary>Validação <span>Erro, orientação e correção</span></summary><div className="ds-input-guide__content"><p>Explique o que falta, preserve o preenchimento e evite repetir envios automaticamente.</p><ValidationDemo/></div></details>
   <details><summary>Valores e estados <span>Ausência não é zero</span></summary><div className="ds-input-guide__content"><dl className="ds-input-guide__values"><div><dt>Sem dado</dt><dd><DisplayValue value={null}/></dd></div><div><dt>Carregando</dt><dd><DisplayValue value={null} state="loading"/></dd></div><div><dt>Indisponível</dt><dd><DisplayValue value={null} state="unavailable"/></dd></div><div><dt>Zero real</dt><dd><DisplayValue value={0}/></dd></div></dl><p>Não preencha a ausência com valores fictícios.</p></div></details>
  </div>
 </div>;
}
