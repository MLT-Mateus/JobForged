// Only banner metadata, never files, credentials or communication recipients.
export const bannerDraftLifetime=7*24*60*60*1000;
export function readBannerDraft(raw,now=Date.now()){
 try{
  const record=JSON.parse(raw||'null'),v=record?.value;
  if(!Number.isFinite(record?.savedAt)||record.savedAt>now||now-record.savedAt>bannerDraftLifetime||!v)return null;
  if(!['title','description','image_id','link'].every(k=>typeof v[k]==='string')||v.title.length>100||v.description.length>240||v.link.length>500)return null;
  const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);
  if((v.id!==null&&!uuid(v.id))||(v.image_id&&!uuid(v.image_id))||(v.mobile_image_id&&!uuid(v.mobile_image_id))||!Number.isInteger(v.version)||v.version<0||typeof v.active!=='boolean'||!Number.isFinite(v.position))return null;
  if(!['string','number'].includes(typeof v.duration_seconds))return null;
  return {id:v.id,version:v.version,title:v.title,description:v.description,image_id:v.image_id,mobile_image_id:v.mobile_image_id||null,link:v.link,active:v.active,position:v.position,duration_seconds:v.duration_seconds};
 }catch{return null}
}
