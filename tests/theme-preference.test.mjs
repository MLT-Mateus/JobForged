import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";
import ts from "typescript";

const source = fs.readFileSync(new URL("../app/components/ui/useThemePreference.ts", import.meta.url), "utf8");
const boot = fs.readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8").match(/__html: `(.*?)`,/s)[1];
function browser({blocked=false, cookie="", saved=null}={}) {
  const data=new Map(saved?[["jobforged-theme",saved]]:[]), listeners=new Map();
  let clock=10000;
 const root={dataset:{},style:{}};
  const document={documentElement:root,cookie,head:{},querySelectorAll:()=>[]};
  const context={Date:class extends Date {static now(){return clock}},exports:{},document,location:{protocol:"https:"},Event:class {constructor(type){this.type=type}},MutationObserver:class{observe(){}disconnect(){}},localStorage:{getItem:k=>{if(blocked)throw Error("Blocked");return data.get(k)??null},setItem:(k,v)=>{if(blocked)throw Error("Blocked");data.set(k,v)}},require:()=>({}),window:{matchMedia:()=>({matches:false}),addEventListener:(key,fn)=>listeners.set(key,fn),removeEventListener:()=>{},dispatchEvent:e=>listeners.get(e.type)?.(e)}};
  vm.createContext(context);
  vm.runInContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,context);
  return {context,root,data,advance:milliseconds=>{clock+=milliseconds}};
}
test("choice persists across LP, login and panel document reloads",()=>{
 const b=browser();b.context.exports.setThemePreference("dark");
 assert.equal(b.data.get("jobforged-theme"),"dark");
 for(const route of ["/","/login","/app/home","/design-system"]){b.root.dataset={};vm.runInContext(boot,b.context);assert.equal(b.root.dataset.theme,"dark",route);assert.equal(b.root.style.colorScheme,"dark");}
 b.advance(3201);b.context.exports.setThemePreference("light");vm.runInContext(boot,b.context);assert.equal(b.root.dataset.theme,"light");
});
test("cookie restores choice if local storage is blocked",()=>{
 const b=browser({blocked:true});b.context.exports.setThemePreference("dark");assert.match(b.context.document.cookie,/jobforged-theme=dark/);b.root.dataset={};vm.runInContext(boot,b.context);assert.equal(b.root.dataset.theme,"dark");
});
test("invalid stored values fall back safely",()=>{
 const b=browser({saved:"invalid"});vm.runInContext(boot,b.context);assert.equal(b.root.dataset.theme,"light");
});
test("another tab updates the current document without resetting the choice",()=>{
 const b=browser();b.context.notifications=0;vm.runInContext('subscribe(()=>globalThis.notifications++)',b.context);
 b.context.window.dispatchEvent({type:"storage",key:"jobforged-theme",newValue:"dark"});
 assert.equal(b.root.dataset.theme,"dark");assert.equal(b.context.notifications,1);
});

test("company icon is scoped and the platform icon returns when cleared",()=>{
 const b=browser();const icon={value:'',getAttribute(){return this.value},setAttribute(_name,value){this.value=value}};
 b.context.document.querySelectorAll=()=>[icon];b.root.dataset.companyIcon='/api/portals/example/assets/fixture';
 vm.runInContext(boot,b.context);assert.equal(icon.value,'/api/portals/example/assets/fixture');
 delete b.root.dataset.companyIcon;vm.runInContext(boot,b.context);assert.equal(icon.value,'/favicon.svg');
 b.root.dataset.companyIcon='https://elsewhere.invalid/icon.svg';vm.runInContext(boot,b.context);assert.equal(icon.value,'/favicon.svg');
});
