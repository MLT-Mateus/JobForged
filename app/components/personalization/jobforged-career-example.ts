import {jobforgedFooter} from '../SiteFooter';
import {brandingDefaults} from './branding-model';
export function jobforgedCareerExample(){
 const data=brandingDefaults('jobforged-example','JobForged');data.shortName='JobForged';
 data.portal.headline='Talentos <span style="color:#4169E1">diferentes.</span> Um futuro <span style="color:#20B2AA">construído juntos.</span>';
 data.portal.footer=structuredClone(jobforgedFooter);
 data.portal.content={opportunitiesTitle:'Oportunidades para <span style="color:#4169E1">fazer</span> <span style="color:#20B2AA">parte.</span>',cultureTitle:'<span style="color:#4169E1">Gente boa</span> constrói <span style="color:#20B2AA">junto.</span>',invitationTitle:'Seu jeito de <span style="color:#4169E1">pensar</span> pode <span style="color:#20B2AA">somar</span> ao nosso.'};
 data.portal.introduction='A gente aproxima pessoas de novas possibilidades. Que tal ajudar a transformar a forma como empresas e talentos se encontram?';
 data.portal.footerText='JobForged · Conectando pessoas e possibilidades.';
 return data;
}
