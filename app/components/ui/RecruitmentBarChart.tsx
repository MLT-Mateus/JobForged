import './recruitment-charts.css';
import {EmptyState} from './AdminPrimitives';
export type ChartDatum={label:string;value:number};
export function RecruitmentBarChart({label,data,vertical=false}:{label:string;data:ChartDatum[];vertical?:boolean}){
 if(!data.some(d=>d.value>0))return <EmptyState variant="compact" title="Ainda não há dados para este gráfico" description="Os resultados aparecerão conforme o recrutamento avançar."/>;
 const maximum=Math.max(1,...data.map(d=>d.value));
 return <figure className={`jf-recruitment-chart ${vertical?'is-vertical':''}`} aria-label={label}><figcaption className="jf-sr-only">{label}</figcaption><div className="jf-recruitment-chart__plot">{data.map(d=><div className="jf-recruitment-chart__item" key={d.label}><span>{d.label}</span><div className="jf-recruitment-chart__track"><i style={vertical?{height:`${d.value/maximum*100}%`}:{width:`${d.value/maximum*100}%`}}/></div><strong>{d.value}</strong></div>)}</div></figure>
}
