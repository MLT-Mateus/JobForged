import type {Application,Interview} from './model';
export const calendarDate=(value:string|null)=>value?new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date(value)):'';
const fold=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();
export function filterInterviews(events:Interview[],applications:Application[],filters:{query:string;from:string;to:string}){
 if(filters.from&&filters.to&&filters.from>filters.to)return [];
 return events.filter(event=>{const date=calendarDate(event.starts_at),candidate=applications.find(a=>a.id===event.application_id);return (!filters.from||!!date&&date>=filters.from)&&(!filters.to||!!date&&date<=filters.to)&&fold(`${event.title} ${candidate?.name||''} ${candidate?.jobTitle||''}`).includes(fold(filters.query));}).sort((a,b)=>(a.starts_at||'9999').localeCompare(b.starts_at||'9999'));
}
