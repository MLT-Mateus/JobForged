"use client";
import {ActionButton} from './AdminPrimitives';
export function WorkspacePagination({page,pageSize,total,onPage,busy=false,label='Paginação'}:{page:number;pageSize:number;total:number;onPage:(page:number)=>void;busy?:boolean;label?:string}){
 const pages=Math.max(1,Math.ceil(total/pageSize));
 return <nav className="jf-pagination" aria-label={label}><span role="status">{total?`${(page-1)*pageSize+1}–${Math.min(page*pageSize,total)} de ${total}`:'Nenhum registro'}</span><div><ActionButton variant="secondary" disabled={busy||page<=1} onClick={()=>onPage(page-1)}>Anterior</ActionButton><span>Página {page} de {pages}</span><ActionButton variant="secondary" disabled={busy||page>=pages} onClick={()=>onPage(page+1)}>Próxima</ActionButton></div></nav>;
}
