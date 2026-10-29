import type {CareerPortal,PortalPresentation} from './personalization-types';
export const defaultPortalPresentation:PortalPresentation={showImage:true,imageAlt:'Equipe colaborando no ambiente de trabalho',showPhotoNotes:true,showHighlights:true,showCulture:true,showInvitation:true,jobsLayout:'cards'};
export function portalPresentation(portal:CareerPortal):PortalPresentation{return {...defaultPortalPresentation,...portal.presentation}}
export function validPortalPresentation(value:unknown):value is PortalPresentation{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const p=value as PortalPresentation;return Object.keys(p).length===7&&['showImage','showPhotoNotes','showHighlights','showCulture','showInvitation'].every(key=>typeof p[key as keyof PortalPresentation]==='boolean')&&typeof p.imageAlt==='string'&&p.imageAlt.trim().length>0&&p.imageAlt.length<=240&&['cards','list'].includes(p.jobsLayout);
}
