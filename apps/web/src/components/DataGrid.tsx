import type { DocumentRecord } from '../types'

const columnName=(index:number)=>{let value='',number=index+1;while(number){number--;value=String.fromCharCode(65+number%26)+value;number=Math.floor(number/26)}return value}

export function DataGrid({document}:{document:DocumentRecord}){
  const windowData=document.window
  if(!windowData)return null
  const width=Math.max(...windowData.rows.map(row=>row.length),0)
  return <div className="grid-scroll" aria-label="Spreadsheet data viewport">
    <table className="data-grid">
      <caption className="sr-only">{document.name}, {windowData.totalRows} rows and {windowData.totalColumns} columns. Selected range {windowData.range}.</caption>
      <thead><tr><th className="corner" aria-hidden="true"></th>{Array.from({length:width},(_,index)=><th key={index} scope="col">{columnName(index)}</th>)}</tr></thead>
      <tbody>{windowData.rows.map((row,rowIndex)=><tr key={rowIndex}><th scope="row">{windowData.row+rowIndex}</th>{Array.from({length:width},(_,columnIndex)=><td className={rowIndex===0?'header-cell':''} key={columnIndex}>{formatCell(row[columnIndex])}</td>)}</tr>)}</tbody>
    </table>
    {windowData.truncated&&<p className="grid-note">Showing the first {windowData.rows.length} rows. Download retains the full workbook.</p>}
  </div>
}

function formatCell(value:unknown){if(value===null||value===undefined)return'';if(typeof value==='object')return JSON.stringify(value);return String(value)}
