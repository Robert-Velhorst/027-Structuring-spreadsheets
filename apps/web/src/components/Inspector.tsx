import { Check, GripVertical, Info, Plus, Trash2 } from 'lucide-react'
import { operationLabels } from '../state'
import type { Capabilities, DocumentRecord, OperationSpec, Preview } from '../types'

type Props={document:DocumentRecord;capabilities:Capabilities|null;operations:OperationSpec[];selectedTypes:Set<string>;preview:Preview|null;acknowledged:boolean;busy:boolean;toggleOperation:(type:string)=>void;setAcknowledged:(value:boolean)=>void;createPreview:()=>void;apply:()=>void}

export function Inspector(props:Props){
  const {document,capabilities,operations,selectedTypes,preview,acknowledged,busy}=props
  return <aside className="inspector" aria-label="Operation inspector">
    <section><div className="inspector-heading"><h2>Target range</h2><Info aria-hidden="true"/></div><div className="range-field">{document.window?.range||'Used range'}</div><label className="check-row"><input type="checkbox" defaultChecked/>Contains header</label><div className="range-meta"><span>Rows: {document.rows}</span><span>Columns: {document.columns}</span></div></section>
    <section><div className="inspector-heading"><h2>Operation sequence</h2><button className="icon-button" aria-label="Add operation"><Plus/></button></div>
      <div className="operation-list">{operations.map((operation,index)=><div className="operation-row" key={operation.type}><span>{index+1}</span><GripVertical aria-hidden="true"/><strong>{operationLabels[operation.type]||operation.type}</strong>{index===0?<Check className="success-icon" aria-label="Enabled"/>:<button className="icon-button" aria-label={`Remove ${operationLabels[operation.type]}`} onClick={()=>props.toggleOperation(operation.type)}><Trash2/></button>}</div>)}</div>
      <details className="operation-picker"><summary>Add or remove operations</summary><div>{capabilities?.operations.map(operation=><label className="check-row" key={operation.type}><input type="checkbox" checked={selectedTypes.has(operation.type)} onChange={()=>props.toggleOperation(operation.type)}/>{operationLabels[operation.type]||operation.type}<small>{operation.risk}</small></label>)}</div></details>
    </section>
    <section className="preview-state"><div className="inspector-heading"><h2>Preview status</h2>{preview&&<span className="state-label">Preview ready</span>}</div>{preview?<><p><strong>Changes detected: {preview.summary.changedCells}</strong></p><p className="preview-shape">{preview.summary.beforeRows} x {preview.summary.beforeColumns} before &rarr; {preview.summary.afterRows} x {preview.summary.afterColumns} after</p><label className="check-row acknowledgement"><input type="checkbox" checked={acknowledged} onChange={event=>props.setAcknowledged(event.target.checked)}/>I reviewed the target and preview.</label><button className="primary full" disabled={busy||!acknowledged} onClick={props.apply}>Apply once</button><p className="safety-copy">A backup will be created before applying.</p></>:<><p className="muted">Create a preview to see exact changes before any write.</p><button className="primary full" disabled={busy||!operations.length} onClick={props.createPreview}>Create preview</button></>}</section>
  </aside>
}
