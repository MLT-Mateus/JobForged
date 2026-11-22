import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const source=readFileSync(new URL('../app/components/ui/input-format.ts',import.meta.url),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {formatInput,inferInputFormat,inputFormatRules}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
test('masks format pasted data and remain stable when editing formatted values',()=>{
 for(const [format,raw,expected] of [['cep','01001000','01001-000'],['cpf','12345678901','123.456.789-01'],['cnpj','12345678000190','12.345.678/0001-90'],['cnpj-alpha','12abc34501de35','12.ABC.345/01DE-35'],['phone','11987654321','(11) 98765-4321']]){
  assert.equal(formatInput(raw,format),expected);assert.equal(formatInput(expected,format),expected);
  assert.match(expected,new RegExp('^'+inputFormatRules[format].pattern+'$'));
 }
 assert.equal(formatInput('01001-000999','cep'),'01001-000');
 assert.equal(formatInput('+55 (11) 98765-4321','phone'),'(11) 98765-4321');
});
test('automatic masks never change search, passwords, email, URLs or unrelated prose',()=>{
 assert.equal(inferInputFormat('CEP','text'),'cep');
 assert.equal(inferInputFormat('CNPJ (opcional)','text'),'cnpj');
 for(const type of ['search','password','email','url'])assert.equal(inferInputFormat('CPF',type),undefined);
 for(const label of ['Buscar por nome, CNPJ ou região','Descrição','Telefone internacional','CPF ou e-mail'])assert.equal(inferInputFormat(label,'text'),undefined);
});
