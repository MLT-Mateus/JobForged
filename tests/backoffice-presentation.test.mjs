import {collectionReturn} from '../shared/collection-location.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const source=readFileSync(new URL('../app/components/admin/backoffice-presentation.ts',import.meta.url),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {administrativeDate,administrativePage,administrativeCompany}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
test('company return preserves exact collection context and rejects external or unrelated destinations',()=>{
 const base='/backoffice/empresas',path=base+'?q=Horizonte&status=active&page=2&view=blocks';
 assert.equal(collectionReturn(path,base),path);
 for(const url of ['https://evil.invalid/backoffice/empresas','//evil.invalid/backoffice/empresas','javascript:alert(1)','/backoffice/usuarios',null])assert.equal(collectionReturn(url,base),base);
});
test('navigation rejects invalid company and page filters without turning them into another scope',()=>{
 const id='99000000-0000-4000-8000-000000000001';assert.equal(administrativeCompany(id),id);
 for(const value of [null,'undefined','other','99000000000040008000000000000001'])assert.equal(administrativeCompany(value),'');
 assert.equal(administrativePage('2'),2);for(const value of [null,'0','-1','1.5','10001','abc'])assert.equal(administrativePage(value),1);
});
test('administrative timestamps match the Brasília date filters regardless of workstation timezone',()=>{
 assert.equal(administrativeDate('2026-11-22T01:30:00Z'),'21/11/2026, 22:30');
 for(const value of [null,undefined,'','invalid'])assert.equal(administrativeDate(value),'Não informado');
});
