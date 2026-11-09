import {careerDefaults} from './career-defaults.ts';
import {lightPalette} from './personalization-mocks.ts';
import type {Customization} from './personalization-types';

/** A legacy light palette contains the original colors; dark colors may be derived. */
export function careerBrandColors(value: {palette?: Partial<Customization['palette']>;theme?: {light?:Partial<Customization['palette']>}}){
 const resolve=(key:'primary'|'secondary')=>{
  for(const color of [value.palette?.[key],value.theme?.light?.[key]]){
   if(typeof color==='string'&&/^#[0-9a-f]{6}$/i.test(color))return color.toUpperCase();
   if(typeof color==='string'&&/^#[0-9a-f]{3}$/i.test(color))return color.toUpperCase().replace(/[0-9A-F]/g,digit=>digit.repeat(2));
  }
  return lightPalette[key].toUpperCase();
 };
 const primary=resolve('primary'),secondary=resolve('secondary');
 return {primary,secondary,custom:primary!==lightPalette.primary.toUpperCase()||secondary!==lightPalette.secondary.toUpperCase()};
}

const stockMasks={
 [careerDefaults.image]:'team-jobforged-v2',
 [careerDefaults.banner]:'team-jobforged-panorama-v1',
 [careerDefaults.cultureBanner]:'culture-jobforged-v1',
};
export function careerPhotoMasks(stock:string){
 const name=stockMasks[stock];
 return name?{primary:`/careers/masks/${name}-primary.webp`,secondary:`/careers/masks/${name}-secondary.webp`}:undefined;
}
