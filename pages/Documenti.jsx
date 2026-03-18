import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { usePagina } from '../hooks/usePagina'
import ConfirmDialog from '../components/ConfirmDialog'
import { useToast } from '../components/Toast'
import { FileText, Plus, X, Trash2, Search, ExternalLink, FolderOpen, Upload, Paperclip } from 'lucide-react'
import Modal from '../components/Modal'

const EMPTY = { nome:'', categoria:'', note:'', cliente_id:'', file_nome:'', file_url:'' }
const CATEGORIE = ['730', 'IVA', 'F24', 'Successione', 'Contratto', 'Bilancio', 'INPS', 'Rottamazione', 'Rateizzazione', 'Visura', 'Altro']

export default function Documenti() {
  usePagina('Documenti')
  const toast = useToast()
  const fileRef = useRef(null)
  const [docs, setDocs]         = useState([])
  const [clienti, setClienti]   = useState([])
  const [modal, setModal]       = useState(false)
  const [form, setForm]         = useState(EMPTY)
  const [saving, setSaving]     = useState(false)
  const [uploading, setUploading] = useState(false)
  const [q, setQ]               = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [confirm, setConfirm]   = useState(null)

  useEffect(() => { load() }, [])

  async function load(){
    try {
    const [{ data:d }, { data:c }] = await Promise.all([
      supabase.from('documenti').select('*, clienti(ragione_sociale,nome,cognome)').order('created_at', { ascending: false }),
      supabase.from('clienti').select('id,ragione_sociale,nome,cognome'),
    ])
    setDocs(d||[]); setClienti(c||[])
    } catch(e) {
      console.error('Errore caricamento:', e)
    }
  }

  async function uploadFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `documenti/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    const { data, error } = await supabase.storage.from('studio-files').upload(path, file)
    if (error) {
      // Storage potrebbe non essere configurato — salva solo il nome
      toast('Upload Storage non configurato — salvo solo il nome file', 'info')
      setForm(f => ({ ...f, file_nome: file.name }))
    } else {
      const { data: urlData } = supabase.storage.from('studio-files').getPublicUrl(path)
      setForm(f => ({ ...f, file_nome: file.name, file_url: urlData.publicUrl }))
      toast('File caricato ✓', 'success')
    }
    setUploading(false)
  }

  async function salva() {
    if (!form.nome.trim()) return
    setSaving(true)
    const { error } = await supabase.from('documenti').insert([{ ...form, cliente_id: form.cliente_id || null }])
    if (error) { toast('Errore salvataggio: ' + error.message, 'error'); setSaving(false); return }
    toast('Documento salvato', 'success')
    setSaving(false); setModal(false); setForm(EMPTY); load()
  }

  function elimina(id, titolo) {
    setConfirm({ msg: `Eliminare il documento "${titolo}"?`, onOk: async () => {
      await supabase.from('documenti').delete().eq('id', id)
      toast('Documento eliminato', 'info')
      load()
    }})
  }

  const nomeC = d => d.clienti ? (d.clienti.ragione_sociale || `${d.clienti.nome||''} ${d.clienti.cognome||''}`.trim()) : '—'
  const filtered = docs.filter(d => {
    const matchQ = !q || d.nome?.toLowerCase().includes(q.toLowerCase()) || nomeC(d).toLowerCase().includes(q.toLowerCase())
    const matchCat = !filtroCategoria || d.categoria === filtroCategoria
    return matchQ && matchCat
  })
  const categoriePres = [...new Set(docs.map(d => d.categoria).filter(Boolean))]

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div>
          <h1 className="page-title">Documenti</h1>
          <p style={{ fontSize:12.5, color:'var(--text4)', marginTop:3 }}>{docs.length} documenti archiviati</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setModal(true) }} style={{ marginLeft:'auto' }}>
          <Plus size={14}/> Nuovo documento
        </button>
      </div>

      {/* Ricerca + filtro */}
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ position:'relative', flex:1, minWidth:200, maxWidth:380 }}>
          <Search size={13} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'var(--text4)', pointerEvents:'none' }} />
          <input className="inp" style={{ paddingLeft:34 }} value={q} onChange={e => setQ(e.target.value)} placeholder="Cerca documenti o clienti..." />
          {q && <button onClick={() => setQ('')} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--text4)', display:'flex' }}><X size={13}/></button>}
        </div>
        <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
          <button onClick={() => setFiltroCategoria('')} style={{ padding:'5px 11px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:`1px solid ${!filtroCategoria ? 'var(--blue)' : 'var(--border2)'}`, background: !filtroCategoria ? 'var(--blue-dim)' : 'var(--bg3)', color: !filtroCategoria ? 'var(--blue2)' : 'var(--text3)' }}>Tutti</button>
          {categoriePres.map(cat => (
            <button key={cat} onClick={() => setFiltroCategoria(cat === filtroCategoria ? '' : cat)} style={{ padding:'5px 11px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:`1px solid ${filtroCategoria===cat ? 'var(--blue)' : 'var(--border2)'}`, background: filtroCategoria===cat ? 'var(--blue-dim)' : 'var(--bg3)', color: filtroCategoria===cat ? 'var(--blue2)' : 'var(--text3)' }}>{cat}</button>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr>
              <th className="th">Documento</th>
              <th className="th">Cliente</th>
              <th className="th">Categoria</th>
              <th className="th">Data</th>
              <th className="th" style={{ width:80 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(d => (
              <tr key={d.id} className="tr">
                <td className="td">
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:34, height:34, borderRadius:8, background:'var(--blue-dim)', border:'1px solid var(--blue-glow)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <FileText size={14} color="var(--blue2)" />
                    </div>
                    <div>
                      <div style={{ fontSize:13.5, fontWeight:600, color:'var(--text1)' }}>{d.nome}</div>
                      {d.file_nome && <div style={{ fontSize:11, color:'var(--text4)', marginTop:1, display:'flex', alignItems:'center', gap:3 }}><Paperclip size={10}/>{d.file_nome}</div>}
                      {d.note && <div style={{ fontSize:11, color:'var(--text4)', marginTop:1, fontStyle:'italic' }}>{d.note}</div>}
                    </div>
                  </div>
                </td>
                <td className="td" style={{ fontSize:12.5, color:'var(--text3)' }}>{nomeC(d)}</td>
                <td className="td">
                  <span className="badge badge-blue">{d.categoria || '—'}</span>
                </td>
                <td className="td" style={{ fontSize:12, color:'var(--text4)' }}>
                  {new Date(d.created_at).toLocaleDateString('it-IT')}
                </td>
                <td className="td">
                  <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                    {d.file_url && (
                      <a href={d.file_url} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ padding:'4px 8px' }}><ExternalLink size={12}/></a>
                    )}
                    <button className="btn btn-red" style={{ padding:'4px 8px' }} onClick={() => elimina(d.id, d.nome)}><Trash2 size={12}/></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5}>
                <div className="empty-state">
                  <div className="empty-state-icon"><FolderOpen size={30}/></div>
                  <div className="empty-state-title">{q || filtroCategoria ? 'Nessun documento trovato' : 'Nessun documento'}</div>
                  <div className="empty-state-sub">{q || filtroCategoria ? "Prova con un'altra ricerca" : 'Aggiungi il primo documento'}</div>
                </div>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <div style={{ position:"fixed", inset:0, zIndex:100, background:"rgba(5,8,20,.82)", backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)", overflow:"hidden", display:"block" }} onClick={() => setModal(false)}>
          <div style={{ background:"var(--bg3)", border:"1px solid var(--border3)", borderRadius:16, width:"100%", maxWidth:540, margin:"32px auto", boxShadow:"0 40px 100px rgba(0,0,0,.7)" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding:"18px 22px", borderBottom:"1px solid var(--border2)", display:"flex", alignItems:"center", justifyContent:"space-between", borderRadius:"16px 16px 0 0" }}>
              <div>
                <h2 style={{ fontSize:15.5, fontWeight:700, color:'var(--text1)' }}>Nuovo documento</h2>
                <p style={{ fontSize:12, color:'var(--text4)', marginTop:2 }}>Archivia un documento cliente</p>
              </div>
              <button onClick={() => setModal(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text4)', display:'flex' }}><X size={15}/></button>
            </div>
            <div style={{ padding:"20px 22px", display:"flex", flexDirection:"column", gap:14 }}>
              <div><label className="lbl">Nome documento *</label>
                <input className="inp" autoFocus value={form.nome} onChange={e => setForm(f=>({...f,nome:e.target.value}))} placeholder="Es. Dichiarazione redditi 2024" />
              </div>
              <div><label className="lbl">Cliente</label>
                <select className="inp" value={form.cliente_id} onChange={e => setForm(f=>({...f,cliente_id:e.target.value}))}>
                  <option value="">— Nessuno —</option>
                  {clienti.map(c => <option key={c.id} value={c.id}>{c.ragione_sociale || `${c.nome||''} ${c.cognome||''}`.trim()}</option>)}
                </select>
              </div>
              <div><label className="lbl">Categoria</label>
                <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginTop:4 }}>
                  {CATEGORIE.map(cat => (
                    <button key={cat} onClick={() => setForm(f=>({...f,categoria:cat}))} style={{ padding:'4px 10px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', border:`1px solid ${form.categoria===cat ? 'var(--blue)' : 'var(--border2)'}`, background: form.categoria===cat ? 'var(--blue-dim)' : 'var(--bg3)', color: form.categoria===cat ? 'var(--blue2)' : 'var(--text3)' }}>{cat}</button>
                  ))}
                </div>
              </div>
              {/* Upload file */}
              <div>
                <label className="lbl">File <span style={{ color:'var(--text4)', fontWeight:400 }}>(opzionale)</span></label>
                <input ref={fileRef} type="file" style={{ display:'none' }} onChange={uploadFile} accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" />
                <div style={{ display:'flex', gap:8, alignItems:'center', marginTop:4 }}>
                  <button onClick={() => fileRef.current?.click()} className="btn btn-ghost" style={{ flex:1, justifyContent:'center' }} disabled={uploading}>
                    {uploading ? <><span className="spinner" style={{ width:13, height:13 }}/> Caricamento...</> : <><Upload size={13}/> Carica file</>}
                  </button>
                  {form.file_nome && <span style={{ fontSize:12, color:'var(--green2)', display:'flex', alignItems:'center', gap:4 }}><Paperclip size={12}/>{form.file_nome}</span>}
                </div>
                {!form.file_nome && (
                  <div style={{ marginTop:6 }}>
                    <input className="inp" value={form.file_url} onChange={e => setForm(f=>({...f,file_url:e.target.value}))} placeholder="Oppure incolla URL manuale: https://..." style={{ fontSize:12 }} />
                  </div>
                )}
              </div>
              <div><label className="lbl">Note</label>
                <textarea className="inp" rows={2} value={form.note} onChange={e => setForm(f=>({...f,note:e.target.value}))} style={{ resize:'none' }} />
              </div>
            </div>
            <div style={{ padding:"14px 22px", borderTop:"1px solid var(--border2)", display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Annulla</button>
              <button className="btn btn-primary" onClick={salva} disabled={saving || !form.nome}>
                {saving ? 'Salvo...' : <><Plus size={13}/> Salva documento</>}
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
    </div>
  )
}
