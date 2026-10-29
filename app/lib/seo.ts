/** Search policy fails closed: only the official Live origin is indexable. */
export function searchEnvironment(environment=process.env.APP_ENV,publicUrl=process.env.APP_PUBLIC_URL){
 const fallback=environment==='test'?'https://test.jobforged.com':'https://jobforged.com';
 let origin=fallback;try{if(publicUrl)origin=new URL(publicUrl).origin}catch{/* Invalid configuration cannot enable indexing. */}
 return {origin,indexable:environment==='live'&&(!publicUrl||publicUrl.replace(/\/$/,'')==='https://jobforged.com')&&origin==='https://jobforged.com'};
}
export const publicSearchPaths=['/','/termos-servico','/politicas-privacidade','/politicas-exclusao'];
export const brandTitle='JobForged | ATS para recrutamento e seleção';
export const brandDescription='Conheça a JobForged (Job Forged), plataforma ATS de recrutamento e seleção para empresas, com personalização da marca e página de carreiras.';
export function publicPageMetadata(path:string){const {origin,indexable}=searchEnvironment();return {alternates:{canonical:new URL(path,origin).href},robots:{index:indexable,follow:true}}}
export function landingStructuredData(origin:string){return {'@context':'https://schema.org','@graph':[
 {'@type':'Organization','@id':`${origin}/#organization`,name:'JobForged',alternateName:'Job Forged',url:`${origin}/`,logo:{'@type':'ImageObject',url:`${origin}/brand/jobforged-logo.png`,width:636,height:184}},
 {'@type':'WebSite','@id':`${origin}/#website`,name:'JobForged',alternateName:['Job Forged'],url:`${origin}/`,inLanguage:'pt-BR',publisher:{'@id':`${origin}/#organization`}},
 {'@type':'WebPage','@id':`${origin}/#webpage`,url:`${origin}/`,name:brandTitle,description:brandDescription,inLanguage:'pt-BR',isPartOf:{'@id':`${origin}/#website`},about:{'@id':`${origin}/#organization`}}
 ]}}
