export const bannerDraftLifetime:number;
export function readBannerDraft(raw:string|null,now?:number):{id:string|null;version:number;title:string;description:string;image_id:string;mobile_image_id:string|null;link:string;active:boolean;position:number;duration_seconds:number|string}|null;
