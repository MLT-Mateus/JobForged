/** Shared copy policy: short action, visible label, literal three-dot suffix. */
export const placeholderLimit=28;
type PlaceholderContext={label?:string;type?:string;placeholder?:string;multiline?:boolean;disabled?:boolean;readOnly?:boolean;selection?:boolean;multiple?:boolean};
export function fieldPlaceholder({label='',type='text',placeholder,multiline=false,disabled=false,readOnly=false,selection=false,multiple=false}:PlaceholderContext){
 const supplied=placeholder?.trim().replace(/[.\u2026\s]+$/gu,'')||'';
 const finish=(text:string)=>`${text}...`;
 const concise=supplied.length<=placeholderLimit&&supplied.split(/\s+/).length<=4&&/^(Digite|Informe|Escreva|Selecione|Busque|Adicione|Escolha|Descreva|Pesquise|Procure|Defina)\b/i.test(supplied);
 if(disabled)return finish(concise&&/^(Selecione|Escolha)\b/i.test(supplied)&&/primeiro|antes/i.test(supplied)?supplied:'Indisponível');
 if(readOnly)return finish('Não informado');
 if(concise)return finish(supplied);
 if(selection)return finish(multiple?'Selecione opções':'Selecione uma opção');
 const context=label.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 if(type==='search'||/buscar|pesquisar/.test(context))return finish('Busque por nome');
 if(type==='password'||/senha/.test(context))return finish('Digite a senha');
 if(type==='email'||/e-mail|email/.test(context))return finish('Digite o e-mail');
 if(/dominio|subdominio|endereco jobforged/.test(context))return finish('Digite o domínio');
 if(type==='url'||/link|url|linkedin|instagram|endereco do link/.test(context))return finish('Informe o link');
 if(type==='tel'||/telefone|whatsapp|celular/.test(context))return finish('Digite o telefone');
 if(/codigo|token/.test(context))return finish('Digite o código');
 if(/cor principal|cor secundaria|cor de |cor do |paleta|hex/.test(context))return finish('Digite a cor');
 if(type==='number'||/salario|valor|preco|peso/.test(context))return finish('Informe o valor');
 if(/titulo/.test(context))return finish('Digite o título');
 if(/nome/.test(context))return finish('Digite o nome');
 if(/cidade/.test(context))return finish('Digite a cidade');
 if(/pais/.test(context))return finish('Digite o país');
 if(/descricao/.test(context))return finish('Escreva a descrição');
 if(/apresentacao/.test(context))return finish('Escreva a apresentação');
 if(/mensagem|assunto/.test(context))return finish('Escreva a mensagem');
 if(/nova opcao|item da lista/.test(context))return finish('Digite uma opção');
 return finish(multiline?'Escreva o texto':'Digite o valor');
}
