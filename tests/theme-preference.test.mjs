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
 const b=browser();const icon={value:'',attributes:{},getAttribute(name){return this.attributes[name]},removeAttribute(name){delete this.attributes[name]},setAttribute(name,value){this.attributes[name]=value;if(name==='href')this.value=value}};
 b.context.document.querySelectorAll=()=>[icon];b.root.dataset.companyIcon='/api/portals/example/assets/fixture';
 vm.runInContext(boot,b.context);assert.equal(icon.value,'/api/portals/example/assets/fixture');assert.equal(icon.attributes.type,undefined);
 delete b.root.dataset.companyIcon;vm.runInContext(boot,b.context);assert.equal(icon.value,'/favicon.svg');
 b.root.dataset.companyIcon='https://elsewhere.invalid/icon.svg';vm.runInContext(boot,b.context);assert.equal(icon.value,'/favicon.svg');
});

test('browser theme and company favicon never rewrite the stable raster search icons',()=>{
 const b=browser();
 const makeIcon=attributes=>({attributes:{...attributes},getAttribute(name){return this.attributes[name]},removeAttribute(name){delete this.attributes[name]},setAttribute(name,value){this.attributes[name]=value}});
 const png=makeIcon({href:'/favicon-96x96.png',type:'image/png',sizes:'96x96'}),ico=makeIcon({href:'/favicon.ico',type:'image/x-icon',sizes:'16x16 32x32 48x48'}),dynamic=makeIcon({href:'/favicon.svg',type:'image/svg+xml',sizes:'any'});
 b.context.document.querySelectorAll=selector=>selector==='link[data-jf-browser-icon]'?[dynamic]:[png,ico,dynamic];
 const stable=JSON.stringify([png.attributes,ico.attributes]);
 b.root.dataset.companyIcon='/api/portals/example/assets/fixture';vm.runInContext(boot,b.context);assert.equal(dynamic.attributes.href,b.root.dataset.companyIcon);assert.equal(JSON.stringify([png.attributes,ico.attributes]),stable);
 delete b.root.dataset.companyIcon;b.data.set('jobforged-theme','dark');vm.runInContext(boot,b.context);assert.equal(dynamic.attributes.href,'/brand/jobforged-symbol-dark.svg');assert.equal(dynamic.attributes.type,'image/svg+xml');assert.equal(JSON.stringify([png.attributes,ico.attributes]),stable);
});
test('company favicon ignores horizontal images and stale loads, and restores on exit',()=>{
 const hook=fs.readFileSync(new URL('../app/components/ui/useBrandingIcon.ts',import.meta.url),'utf8');
 const root={dataset:{}},images=[];let cleanup;
 const context={exports:{},document:{documentElement:root},require:()=>({useEffect:fn=>{cleanup=fn()}}),Image:class{constructor(){images.push(this)}}};
 vm.createContext(context);vm.runInContext(ts.transpileModule(hook,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,context);
 const url='/api/portals/example/assets/38000000-0000-0000-0000-000000000041';
 context.exports.useBrandingIcon(url);images[0].naturalWidth=600;images[0].naturalHeight=200;images[0].onload();assert.equal(root.dataset.companyIcon,'');cleanup();
 context.exports.useBrandingIcon(url);images[1].naturalWidth=256;images[1].naturalHeight=256;images[1].onload();assert.equal(root.dataset.companyIcon,url+'?icon=1&v=3');cleanup();assert.equal(root.dataset.companyIcon,undefined);
 context.exports.useBrandingIcon(url);const stale=images[2].onload;cleanup();images[2].naturalWidth=256;images[2].naturalHeight=256;stale();assert.equal(root.dataset.companyIcon,undefined);
 context.exports.useBrandingIcon('/brand/horizontal-logo.svg');assert.equal(images.length,3);assert.equal(root.dataset.companyIcon,'');cleanup();
});

test('known company loader colors are restored only inside their route scope',()=>{
 const b=browser({saved:'light'}),colors={};let cleared=false;
 b.context.location.pathname='/app/minha-conta';b.root.style.setProperty=(key,value)=>{colors[key]=value};
 b.context.sessionStorage={getItem:()=>JSON.stringify({scope:'/app/',theme:'dark',allowSwitch:false,palettes:{light:{primary:'#813bff',secondary:'#a42364',surface:'#ffffff'},dark:{primary:'#ae8bff',secondary:'#f09ac5',surface:'#102522'}}}),removeItem:()=>{cleared=true}};
 vm.runInContext(boot,b.context);assert.equal(colors['--jf-loader-primary'],'#ae8bff');assert.equal(colors['--jf-loader-surface'],'#102522');assert.equal(b.root.dataset.loaderSeed,'true');
 b.context.location.pathname='/login';for(const key of Object.keys(colors))delete colors[key];vm.runInContext(boot,b.context);assert.equal(cleared,true);assert.deepEqual(colors,{});
});
