"use client";
import './recruitment-calendar.css';
export function RecruitmentCalendar({month,selected,onSelect,counts={}}:{month:string;selected:string;onSelect:(day:string)=>void;counts?:Record<string,number>}){
 const valid=/^\d{4}-(0[1-9]|1[0-2])$/.test(month);if(!valid)return null;
 const first=new Date(month+'-01T12:00:00'),days=new Date(first.getFullYear(),first.getMonth()+1,0).getDate();
 return <div className="jf-recruitment-calendar" aria-label="Calendário de entrevistas">{['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d=><span className="jf-recruitment-calendar__weekday" key={d}>{d}</span>)}{Array.from({length:first.getDay()},(_,i)=><span key={'blank'+i}/>)}{Array.from({length:days},(_,i)=>{const value=month+'-'+String(i+1).padStart(2,'0'),count=counts[value]||0;return <button type="button" className={selected===value?'is-active':''} key={value} aria-pressed={selected===value} onClick={()=>onSelect(selected===value?'':value)} aria-label={`${i+1}, ${count} compromissos`}><strong>{i+1}</strong>{count>0&&<span>{count}</span>}</button>})}</div>
}
