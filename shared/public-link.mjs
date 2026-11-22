/** Public audiences must not be sent into company/platform administration. */
export function isPublicDestination(value, origin = 'https://test.jobforged.com') {
 return isAudienceDestination(value,'public',origin);
}
export function isAudienceDestination(value,audience,origin = 'https://test.jobforged.com') {
 if(!value)return true;
 try{const url=new URL(value,origin);if(!['https:','http:','mailto:','tel:'].includes(url.protocol)||url.username||url.password)return false;
 const internal=['jobforged.com','www.jobforged.com','test.jobforged.com',new URL(origin).hostname].includes(url.hostname);
 if(!internal||audience==='platform_admins')return true;
 return !/^\/(?:backoffice|design-system)(?:\/|$)/i.test(url.pathname)&&(audience!=='public'||!/^\/app(?:\/|$)/i.test(url.pathname));
 }catch{return false}
}
