import './recruitment-charts.css';
export type ChartDatum={label:string;value:number};
export function RecruitmentBarChart({label,data,vertical=false}:{label:string;data:ChartDatum[];vertical?:boolean}){
 const maximum=Math.max(1,...data.map(d=>d.value));
 return <figure className={`jf-recruitment-chart ${vertical?'is-vertical':''}`} aria-label={label}><figcaption className="jf-recruitment-chart__caption">{label}</figcaption><div className="jf-recruitment-chart__plot">{data.map(d=><div className="jf-recruitment-chart__item" key={d.label}><span>{d.label}</span><div className="jf-recruitment-chart__track"><i style={vertical?{height:`${d.value/maximum*100}%`}:{width:`${d.value/maximum*100}%`}}/></div><strong>{d.value}</strong></div>)}</div></figure>
}
