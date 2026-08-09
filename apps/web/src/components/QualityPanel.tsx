import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { Quality } from '../types'

export function QualityPanel({quality}:{quality:Quality}){
  const state=quality.score>=85?'Good':quality.score>=65?'Fair':'Needs attention'
  return <section className="quality-band" aria-labelledby="quality-title">
    <div className="section-tabs"><h2 id="quality-title">Quality</h2><span>Column issues</span><span>Duplicate rows ({quality.duplicateRows})</span><span>Whitespace</span></div>
    <div className="quality-values">
      <div className="score-cell"><div className="score-ring" style={{'--score':`${quality.score*3.6}deg`} as React.CSSProperties}><strong>{quality.score}</strong><span>/ 100</span></div><span>{state}</span></div>
      <QualityValue label="Empty cells" value={quality.emptyCells} detail={percent(quality.emptyCells,quality.totalCells)} healthy={quality.emptyCells===0}/>
      <QualityValue label="Whitespace" value={quality.whitespaceIssues} detail={percent(quality.whitespaceIssues,quality.totalCells)} healthy={quality.whitespaceIssues===0}/>
      <QualityValue label="Duplicate rows" value={quality.duplicateRows} detail="rows" healthy={quality.duplicateRows===0}/>
      <QualityValue label="Mixed columns" value={quality.mixedTypeColumns} detail="columns" healthy={quality.mixedTypeColumns===0}/>
    </div>
  </section>
}

function QualityValue({label,value,detail,healthy}:{label:string;value:number;detail:string;healthy:boolean}){return <div className="quality-cell"><span>{label}</span><strong>{value}</strong><small className={healthy?'healthy':'attention'}>{healthy?<CheckCircle2/>:<AlertTriangle/>}{detail}</small></div>}
function percent(value:number,total:number){return total?`${(value/total*100).toFixed(1)}% of ${total}`:'0%'}
