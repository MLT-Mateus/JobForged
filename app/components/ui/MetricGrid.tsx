import {Children,type ReactNode} from 'react';
import './communications.css';
/** A summary contains at most four indicators. */
export function MetricGrid({children}:{children:ReactNode}){return <div className="jf-metric-grid">{Children.toArray(children).slice(0,4)}</div>}
