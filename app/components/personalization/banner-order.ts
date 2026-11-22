export const normalizeBannerOrder=<T extends {order:number}>(items:T[]):T[]=>items.map((value,order)=>({...value,order}));
/** Reinsert, never swap: the relative order of other banners is preserved. */
export function moveBannerTo<T extends {order:number}>(items:T[],from:number,to:number):T[]{
 if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=items.length||to>=items.length)return items;
 const next=[...items],item=next.splice(from,1)[0];next.splice(to,0,item);return normalizeBannerOrder(next);
}
