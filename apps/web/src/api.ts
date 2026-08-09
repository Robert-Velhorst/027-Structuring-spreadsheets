import type { ApplyRequest, PreviewRequest } from './state'
import type { Capabilities, DocumentRecord, Envelope, History, OperationRecord, Preview } from './types'

export class ApiError extends Error {
  code:string
  requestId?:string
  constructor(code:string,message:string,requestId?:string){super(message);this.code=code;this.requestId=requestId}
}

const endpoint = () => (localStorage.getItem('sheet-shaper-endpoint') || '').replace(/\/$/, '')
const token = () => sessionStorage.getItem('sheet-shaper-token') || ''

async function request<T>(path:string, init:RequestInit = {}):Promise<T>{
  const headers = new Headers(init.headers)
  if(token()) headers.set('Authorization',`Bearer ${token()}`)
  if(init.body && !(init.body instanceof FormData)) headers.set('Content-Type','application/json')
  let response:Response
  try { response = await fetch(endpoint()+path,{...init,headers}) }
  catch { throw new ApiError('SERVICE_UNAVAILABLE','The Sheet Shaper service is not reachable. Start it locally or check the cloud connection.') }
  const body = await response.json().catch(()=>null) as Envelope<T>|null
  if(!response.ok || !body || !body.ok){
    const error = body && !body.ok ? body.error : {code:'HTTP_ERROR',message:`Request failed with status ${response.status}`}
    throw new ApiError(error.code,error.message,'requestId' in error?error.requestId:undefined)
  }
  return body.data
}

async function download(id:string):Promise<{blob:Blob;filename:string}>{
  const headers = new Headers()
  if(token()) headers.set('Authorization',`Bearer ${token()}`)
  let response:Response
  try { response=await fetch(endpoint()+`/api/v1/documents/${encodeURIComponent(id)}/download`,{headers}) }
  catch { throw new ApiError('SERVICE_UNAVAILABLE','The Sheet Shaper service is not reachable.') }
  if(!response.ok){
    const body=await response.json().catch(()=>null) as Envelope<never>|null
    const error=body&&!body.ok?body.error:{code:'DOWNLOAD_FAILED',message:'The download failed safely.'}
    throw new ApiError(error.code,error.message,'requestId' in error?error.requestId:undefined)
  }
  const disposition=response.headers.get('content-disposition')||''
  const match=/filename="?([^";]+)"?/i.exec(disposition)
  return {blob:await response.blob(),filename:match?.[1]||'sheet-shaper-output'}
}

export const api = {
  configure(baseUrl:string,apiToken:string){if(baseUrl.trim())localStorage.setItem('sheet-shaper-endpoint',baseUrl.trim().replace(/\/$/,''));else localStorage.removeItem('sheet-shaper-endpoint');if(apiToken)sessionStorage.setItem('sheet-shaper-token',apiToken);else sessionStorage.removeItem('sheet-shaper-token')},
  configuration(){return {endpoint:endpoint(),tokenConfigured:Boolean(token())}},
  capabilities:()=>request<Capabilities>('/api/v1/capabilities'),
  documents:()=>request<DocumentRecord[]>('/api/v1/documents'),
  document:(id:string)=>request<DocumentRecord>(`/api/v1/documents/${encodeURIComponent(id)}?rows=100&columns=30`),
  upload:(file:File)=>{const form=new FormData();form.set('file',file);return request<DocumentRecord>('/api/v1/documents',{method:'POST',body:form})},
  preview:(id:string,body:PreviewRequest)=>request<Preview>(`/api/v1/documents/${encodeURIComponent(id)}/preview`,{method:'POST',body:JSON.stringify(body)}),
  apply:(id:string,body:ApplyRequest)=>request<OperationRecord>(`/api/v1/documents/${encodeURIComponent(id)}/apply`,{method:'POST',body:JSON.stringify(body)}),
  history:(page=1,status='',query='')=>request<History>(`/api/v1/history?page=${page}&page_size=20&status=${encodeURIComponent(status)}&query=${encodeURIComponent(query)}`),
  restore:(id:string)=>request<OperationRecord>(`/api/v1/operations/${encodeURIComponent(id)}/restore`,{method:'POST'}),
  remove:(id:string)=>request<{deleted:boolean;documentId:string}>(`/api/v1/documents/${encodeURIComponent(id)}`,{method:'DELETE'}),
  download,
}
