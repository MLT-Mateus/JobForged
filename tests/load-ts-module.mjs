import {readFileSync} from 'node:fs';
import ts from 'typescript';
const cache=new Map();
function moduleUrl(file){
 if(cache.has(file.href))return cache.get(file.href);
 let code=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 code=code.replace(/from (['"])(\.[^'"]+)\1/g,(_,quote,spec)=>'from '+JSON.stringify(moduleUrl(new URL(spec+(/\.tsx?$/.test(spec)?'':'.ts'),file))));
 const url='data:text/javascript;base64,'+Buffer.from(code).toString('base64');cache.set(file.href,url);return url;
}
export const loadTs=file=>import(moduleUrl(file));
