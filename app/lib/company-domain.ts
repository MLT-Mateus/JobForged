export type CompanyDomain={hostname?:string;targetHost?:string;version:number;status:'none'|'pending'|'verified'|'active'|'disabled';record?:string;proof?:string;checkedAt?:string|null};
export function companyPageHref(slug:string,domain:CompanyDomain|null,now=Date.now()){
 const checked=domain?.checkedAt?Date.parse(domain.checkedAt):NaN;
 return domain?.status==='active'&&validCompanyHostname(domain.hostname)&&checked<=now&&now-checked<20*60*1000
  ?`https://${domain.hostname}`:`/${encodeURIComponent(slug)}`;
}
export function validCompanyHostname(input:unknown):input is string{return typeof input==='string'&&input.length>=4&&input.length<=253&&/^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{1,62}$/.test(input)&&input!=='jobforged.com'&&!input.endsWith('.jobforged.com')&&!/\.(localhost|local)$/.test(input)}
