/** Accept only the intended local collection, never arbitrary redirect destinations. */
export function collectionReturn(value,base){
 if(!value)return base;
 try{const url=new URL(value,'https://jobforged.invalid');return url.origin==='https://jobforged.invalid'&&url.pathname===base?url.pathname+url.search:base}catch{return base}
}
