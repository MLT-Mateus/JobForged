/** Masks assist typing; server validation remains authoritative. Never mask passwords or free text. */
export type InputFormat='cpf'|'cnpj'|'phone'|'otp';
const digits=(value:string)=>value.replace(/\D/g,'');
export const maskCpf=(value:string)=>digits(value).slice(0,11).replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2');
export const maskCnpj=(value:string)=>digits(value).slice(0,14).replace(/(\d{2})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1/$2').replace(/(\d{4})(\d{1,2})$/,'$1-$2');
export function maskPhone(value:string){const d=digits(value).slice(0,11);return d.length<=10?d.replace(/(\d{2})(\d)/,'($1) $2').replace(/(\d{4})(\d)/,'$1-$2'):d.replace(/(\d{2})(\d)/,'($1) $2').replace(/(\d{5})(\d)/,'$1-$2')}
export const formatInput=(value:string,format:InputFormat)=>format==='cpf'?maskCpf(value):format==='cnpj'?maskCnpj(value):format==='phone'?maskPhone(value):digits(value).slice(0,6);
export const inputFormatRules={cpf:{maxLength:14,pattern:'[0-9]{3}\\.[0-9]{3}\\.[0-9]{3}-[0-9]{2}',title:'Informe os 11 dígitos do CPF.'},cnpj:{maxLength:18,pattern:'[0-9]{2}\\.[0-9]{3}\\.[0-9]{3}/[0-9]{4}-[0-9]{2}',title:'Informe os 14 dígitos do CNPJ.'},phone:{maxLength:15,pattern:'\\([0-9]{2}\\) [0-9]{4,5}-[0-9]{4}',title:'Informe DDD e telefone brasileiro, com 10 ou 11 dígitos.'},otp:{maxLength:6,pattern:'[0-9]{6}',title:'Informe os 6 dígitos do autenticador.'}} as const;
