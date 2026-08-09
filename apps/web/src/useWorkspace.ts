import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, ApiError } from './api'
import { defaultOperations, newIdempotencyKey } from './state'
import type { Capabilities, DocumentRecord, History, OperationRecord, OperationSpec, Preview } from './types'

export type View = 'workspace'|'history'|'connections'|'settings'

export function useWorkspace(){
  const [capabilities,setCapabilities]=useState<Capabilities|null>(null)
  const [documents,setDocuments]=useState<DocumentRecord[]>([])
  const [document,setDocument]=useState<DocumentRecord|null>(null)
  const [history,setHistory]=useState<History>({items:[],page:1,pageSize:20,total:0,pages:1,statusCounts:{}})
  const [operations,setOperations]=useState<OperationSpec[]>(defaultOperations)
  const [preview,setPreview]=useState<Preview|null>(null)
  const [acknowledged,setAcknowledged]=useState(false)
  const [view,setView]=useState<View>('workspace')
  const [busy,setBusy]=useState('')
  const [error,setError]=useState<ApiError|null>(null)
  const [historyStatus,setHistoryStatus]=useState('')
  const [historyQuery,setHistoryQuery]=useState('')

  const selectDocument=useCallback(async(id:string)=>{
    setBusy('Loading spreadsheet');setError(null);setPreview(null);setAcknowledged(false)
    try{setDocument(await api.document(id))}catch(reason){setError(normalizeError(reason))}finally{setBusy('')}
  },[])

  const refreshHistory=useCallback(async(page=1,status=historyStatus,query=historyQuery)=>{
    try{setHistory(await api.history(page,status,query))}catch(reason){setError(normalizeError(reason))}
  },[historyQuery,historyStatus])

  const load=useCallback(async()=>{
    setBusy('Connecting to the local service');setError(null)
    try{
      const [nextCapabilities,nextDocuments,nextHistory]=await Promise.all([api.capabilities(),api.documents(),api.history()])
      setCapabilities(nextCapabilities);setDocuments(nextDocuments);setHistory(nextHistory)
      if(nextDocuments.length){const active=document && nextDocuments.some(item=>item.id===document.id)?document.id:nextDocuments[0].id;setDocument(await api.document(active))}
      else setDocument(null)
    }catch(reason){setCapabilities(null);setError(normalizeError(reason))}finally{setBusy('')}
  },[document])

  useEffect(()=>{void load()},[]) // eslint-disable-line react-hooks/exhaustive-deps

  const upload=useCallback(async(file:File)=>{
    setBusy('Importing spreadsheet');setError(null)
    try{const imported=await api.upload(file);setDocuments(items=>[imported,...items.filter(item=>item.id!==imported.id)]);setDocument(imported);setPreview(null);setView('workspace')}
    catch(reason){setError(normalizeError(reason))}finally{setBusy('')}
  },[])

  const analyze=useCallback(async()=>{if(!document)return;await selectDocument(document.id)},[document,selectDocument])

  const createPreview=useCallback(async()=>{
    if(!document)return
    setBusy('Creating a safe preview');setError(null);setAcknowledged(false)
    try{setPreview(await api.preview(document.id,{range:document.window?.range||'',hasHeader:true,operations}))}
    catch(reason){setPreview(null);setError(normalizeError(reason))}finally{setBusy('')}
  },[document,operations])

  const apply=useCallback(async()=>{
    if(!document||!preview||!acknowledged)return
    setBusy('Applying and validating');setError(null)
    try{await api.apply(document.id,{previewToken:preview.previewToken,acknowledged:true,idempotencyKey:newIdempotencyKey()});setPreview(null);setAcknowledged(false);setDocument(await api.document(document.id));await refreshHistory(1)}
    catch(reason){setError(normalizeError(reason));await refreshHistory(1)}finally{setBusy('')}
  },[acknowledged,document,preview,refreshHistory])

  const restore=useCallback(async(operation:OperationRecord)=>{
    if(!window.confirm(`Restore ${operation.documentName || 'this document'} from its validated backup?`))return
    setBusy('Restoring backup');setError(null)
    try{await api.restore(operation.id);if(document?.id===operation.documentId)setDocument(await api.document(document.id));await refreshHistory(history.page)}
    catch(reason){setError(normalizeError(reason))}finally{setBusy('')}
  },[document,history.page,refreshHistory])

  const download=useCallback(async()=>{
    if(!document)return
    setBusy('Preparing download');setError(null)
    try{
      const result=await api.download(document.id);const url=URL.createObjectURL(result.blob);const link=window.document.createElement('a')
      link.href=url;link.download=result.filename;link.click();URL.revokeObjectURL(url)
    }catch(reason){setError(normalizeError(reason))}finally{setBusy('')}
  },[document])

  const deleteDocument=useCallback(async()=>{
    if(!document||!window.confirm(`Delete ${document.name} and every local backup? This cannot be undone.`))return
    setBusy('Deleting local document');setError(null)
    try{
      await api.remove(document.id);const remaining=documents.filter(item=>item.id!==document.id);setDocuments(remaining);setDocument(remaining.length?await api.document(remaining[0].id):null);setPreview(null);await refreshHistory(1)
    }catch(reason){setError(normalizeError(reason))}finally{setBusy('')}
  },[document,documents,refreshHistory])

  const configure=useCallback(async(endpoint:string,token:string)=>{api.configure(endpoint,token);await load()},[load])
  const toggleOperation=useCallback((type:string)=>{setOperations(current=>current.some(item=>item.type===type)?current.filter(item=>item.type!==type):[...current,{type,options:{}}]);setPreview(null);setAcknowledged(false)},[])
  const selectedTypes=useMemo(()=>new Set(operations.map(item=>item.type)),[operations])

  return {capabilities,documents,document,history,operations,selectedTypes,preview,acknowledged,view,busy,error,historyStatus,historyQuery,setView,setAcknowledged,setHistoryStatus,setHistoryQuery,selectDocument,refreshHistory,upload,analyze,createPreview,apply,restore,download,deleteDocument,configure,toggleOperation,clearError:()=>setError(null)}
}

function normalizeError(reason:unknown){return reason instanceof ApiError?reason:new ApiError('UNEXPECTED_ERROR',reason instanceof Error?reason.message:'The request failed safely.')}
