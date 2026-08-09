import { useState } from 'react'
import { CheckCircle2, Cloud, HardDrive, Link2, LockKeyhole } from 'lucide-react'
import { api } from '../api'
import type { Capabilities } from '../types'

export function Connections({capabilities,configure}:{capabilities:Capabilities|null;configure:(endpoint:string,token:string)=>Promise<void>}){
  const current=api.configuration();const [endpoint,setEndpoint]=useState(current.endpoint);const [token,setToken]=useState('');const [saving,setSaving]=useState(false)
  const submit=async(event:React.FormEvent)=>{event.preventDefault();setSaving(true);try{await configure(endpoint,token)}finally{setSaving(false);setToken('')}}
  return <main className="settings-page"><header><h1>Connections</h1><p>Choose the service this browser uses. Credentials stay in this browser session.</p></header>
    <div className="connection-list"><Connection icon={<HardDrive/>} title="Local service" state={capabilities?'Connected':'Disconnected'} detail="Loopback-only by default. Spreadsheet data stays on this computer." ready={Boolean(capabilities)}/><Connection icon={<Cloud/>} title="Cloud via ngrok" state={capabilities?.mode==='public'?'Connected':'Setup required'} detail="Public mode requires a strong bearer token and explicit browser origin." ready={capabilities?.mode==='public'}/><Connection icon={<Link2/>} title="HAI connector" state={capabilities?.hai.configured?'Ready':'Setup required'} detail={capabilities?.hai.mutationsEnabled?'Reviewed mutations enabled':'Read and preview only by default'} ready={Boolean(capabilities?.hai.configured)}/></div>
    <form className="connection-form" onSubmit={submit}><h2>Service endpoint</h2><label>Endpoint URL<input value={endpoint} onChange={event=>setEndpoint(event.target.value)} placeholder="Leave blank for this origin" inputMode="url"/></label><label>Bearer token<input value={token} onChange={event=>setToken(event.target.value)} placeholder={current.tokenConfigured?'Token configured for this session':'Required for public and HAI access'} type="password" autoComplete="off"/></label><button className="primary" disabled={saving}>{saving?'Connecting...':'Save and verify'}</button><p><LockKeyhole/> Tokens are held in session storage and are not written to the workbook database.</p></form>
  </main>
}

function Connection({icon,title,state,detail,ready}:{icon:React.ReactNode;title:string;state:string;detail:string;ready:boolean}){return <section className="connection-row"><span className="connection-icon">{icon}</span><div><h2>{title}</h2><p>{detail}</p></div><span className={ready?'connection-ready':'connection-setup'}>{ready&&<CheckCircle2/>}{state}</span></section>}
