export async function probeServices({upstream,headers,query,fetcher=fetch}){
 const check=async(id,path,method='GET')=>{try{const r=await fetcher(new URL(path,upstream),{method,headers:{...headers,...(method==='POST'?{'Content-Type':'application/json'}:{})},...(method==='POST'?{body:'{}'}:{}),signal:AbortSignal.timeout(2500)});await r.body?.cancel();return{id,state:r.ok?'operational':'degraded'}}catch{return{id,state:'degraded'}}};
 const database=(async()=>{try{await query('select 1');return await check('data','/rest/v1/rpc/platform_public_settings','POST')}catch{return{id:'data',state:'degraded'}}})();
 return Promise.all([check('access','/auth/v1/health'),database,check('files','/storage/v1/status')]);
}
