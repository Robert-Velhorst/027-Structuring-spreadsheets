import type { OperationSpec } from './types'

export type PreviewRequest = { range:string; hasHeader:boolean; operations:OperationSpec[] }
export type ApplyRequest = { previewToken:string; acknowledged:boolean; idempotencyKey:string }

export const operationLabels:Record<string,string>={smart_trim:'Smart trim',remove_duplicates:'Remove duplicates',uppercase:'UPPERCASE',lowercase:'lowercase',title_case:'Title Case',sentence_case:'Sentence case',remove_empty_rows:'Remove empty rows',remove_empty_columns:'Remove empty columns',split_text:'Split text',sort_rows:'Sort rows'}

export const defaultOperations:OperationSpec[]=[
  {type:'smart_trim',options:{}},
  {type:'remove_duplicates',options:{}},
  {type:'title_case',options:{columns:[1,2]}},
]

export const newIdempotencyKey=()=>globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
