import { useState, useEffect } from 'react'
import { supabase, parseLocalDate } from '../lib/supabase'
import { useToast } from '../components/Toast'
import {Check, AlertTriangle, Clock, Info, Calendar, ChevronRight, CheckCircle2, Euro, History, Plus, X} from 'lucide-react'
import { usePagina } from '../hooks/usePagina'
import ConfirmDialog from '../components/ConfirmDialog'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import Modal from '../components/Modal'

const EMPTY_FORM = { titolo: '', data_scadenza: '', tipo: 'scadenza', importo: '', descrizione: '', cliente_id: '' }

export default function Notifiche() {
  const toast = useToast()
  const [scadenze, setScadenze]     = useState([])
  const [scadute, setScadute]       = useState([])
  const [clienti, setClienti]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [filtro, setFiltro]         = useState('tutte')
  const [vistaScadute, setVistaScadute] = useState(false)
  const [modal, setModal]           = useState(false)
  const [form, setForm]             = useState(EMPTY_FORM)
  const [saving, setSaving]         = useState(false)
  const [confirm, setConfirm]       = useState(null)

  usePagina('Scadenze', modal, () => setModal(false))

  useEffect(() => { load() }, [])

  async function load(){
    try {
    const oggi    = new Date().toISOString().split('T')[0]
    const fra30   = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
    const ieri    = new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0]
    const fa60    = new Date(Date.now() - 60 * 86400000).toISOString().split('T')[0]

    const [{ data: pross }, { data: scad }, { data: cli }] = await Promise.all([
      supabase.from('scadenze')
        .select('*, clienti(id,ragione_sociale,nome,cognome)')
        .gte('data_scadenza', oggi).lte('data_scadenza', fra30)
        .eq('completata', false).order('data_scadenza'),
      supabase.from('scadenze')
        .select('*, clienti(id,ragione_sociale,nome,cognome)')
        .gte('data_scadenza', fa60).lt('data_scadenza', oggi)
        .eq('completata', false).order('data_scadenza', { ascending: false }),
      supabase.from('clienti').select('id,ragione_sociale,nome,cognome'),
    ])
    setScadenze(pross || [])
    setScadute(scad || [])
    setClienti(cli || [])
    } catch(e) {
      console.error('Errore caricamento:', e)
    } finally {
      setLoading(false)
    }
  }

  async function segnaCompletata(id, titolo) {
    const { error } = await supabase.from('scadenze').update({ completata: true }).eq('id', id)
    if (error) { toast('Errore aggiornamento', 'error'); return }
    toast(`"${titolo}" completata`, 'success')
    load()
  }

  async function eliminaScadenza(id, titolo) {
    setConfirm({ msg: `Eliminare la scadenza "${titolo}"?`, onOk: async () => {
      await supabase.from('scadenze').delete().eq('id', id)
      load()
    }})
  }

  async function salvaScadenza() {
    if (!form.titolo.trim() || !form.data_scadenza) return
    setSaving(true)
    const { error } = await supabase.from('scadenze').insert([{
      titolo: form.titolo,
      data_scadenza: form.data_scadenza,
      tipo: form.tipo,
      importo: parseFloat(form.importo) || null,
      descrizione: form.descrizione || null,
      cliente_id: form.cliente_id || null,
      completata: false,
    }])
    setSaving(false)
    if (error) { toast('Errore salvataggio', 'error'); return }
    toast('Scadenza aggiunta', 'success')
    setModal(false); setForm(EMPTY_FORM); load()
  }

  function urgenza(data_scadenza) {
    const oggi = new Date(); oggi.setHours(0,0,0,0)
    const giorni = Math.ceil((parseLocalDate(data_scadenza) - oggi) / 86400000)
    if (giorni <= 2)  return { label: 'Urgente',          key: 'urgenti',  color: '#ef4444', dim: 'rgba(239,68,68,0.07)',  border: 'rgba(239,68,68,0.18)',  Icon: AlertTriangle, giorni }
    if (giorni <= 7)  return { label: 'Questa settimana', key: 'prossime', color: '#f97316', dim: 'rgba(249,115,22,0.07)', border: 'rgba(249,115,22,0.16)', Icon: Clock,         giorni }
    return              { label: 'In arrivo',             key: 'arrivo',   color: '#3b82f6', dim: 'rgba(59,130,246,0.07)', border: 'rgba(59,130,246,0.14)', Icon: Info,          giorni }
  }

  const nomeC    = c => c ? (c.ragione_sociale || `${c.nome||''} ${c.cognome||''}`.trim()) : null
  const urgenti  = scadenze.filter(s => urgenza(s.data_scadenza).key === 'urgenti').length
  const prossime = scadenze.filter(s => urgenza(s.data_scadenza).key === 'prossime').length
  const inArrivo = scadenze.filter(s => urgenza(s.data_scadenza).key === 'arrivo').length
  const filtered = filtro === 'tutte' ? scadenze : scadenze.filter(s => urgenza(s.data_scadenza).key === filtro)

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:240 }}><div className="spinner" style={{ width:28, height:28 }} /></div>

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
        <div>
          <h1 className="page-title">Scadenze & Notifiche</h1>
          <p style={{ fontSize:12.5, color:'var(--text4)', marginTop:3 }}>
            {scadenze.length} prossimi 30gg · {scadute.length > 0 && <span style={{ color:'#f87171', fontWeight:600 }}>{scadute.length} scadute non completate</span>}
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {scadute.length > 0 && (
            <button onClick={() => setVistaScadute(v => !v)}
              className={`btn ${vistaScadute ? 'btn-red' : 'btn-ghost'}`}
              style={{ fontSize:12 }}>
              <History size={13} /> {vistaScadute ? 'Nascondi scadute' : `Scadute (${scadute.length})`}
            </button>
          )}
          <button className="btn btn-primary" onClick={() => { setForm(EMPTY_FORM); setModal(true) }}>
            <Plus size={13} /> Nuova scadenza
          </button>
        </div>
      </div>

      {/* Banner scadute */}
      {scadute.length > 0 && !vistaScadute && (
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderRadius:10, background:'var(--red-dim)', border:'1px solid rgba(239,68,68,.2)', cursor:'pointer' }}
          onClick={() => setVistaScadute(true)}>
          <AlertTriangle size={16} color="#f87171" style={{ flexShrink:0 }} />
          <div style={{ flex:1 }}>
            <span style={{ fontSize:13.5, fontWeight:700, color:'#f87171' }}>{scadute.length} scadenz{scadute.length===1?'a':'e'} non completat{scadute.length===1?'a':'e'} nel passato</span>
            <span style={{ fontSize:12, color:'rgba(248,113,113,.7)', marginLeft:8 }}>Clicca per visualizzarle</span>
          </div>
          <ChevronRight size={14} color="#f87171" />
        </div>
      )}

      {/* Scadute passate */}
      {vistaScadute && scadute.length > 0 && (
        <div className="card" style={{ padding:0, overflow:'hidden', border:'1.5px solid rgba(239,68,68,.25)' }}>
          <div style={{ padding:'12px 16px', borderBottom:'1px solid rgba(239,68,68,.15)', background:'rgba(239,68,68,.06)', display:'flex', alignItems:'center', gap:8 }}>
            <History size={14} color="#f87171" />
            <span style={{ fontSize:13, fontWeight:700, color:'#f87171' }}>Scadenze passate non completate ({scadute.length})</span>
          </div>
          {scadute.map((s,i) => {
            const giorni = Math.ceil((new Date() - parseLocalDate(s.data_scadenza)) / 86400000)
            const cliente = nomeC(s.clienti)
            return (
              <div key={s.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 16px', borderBottom: i<scadute.length-1 ? '1px solid rgba(239,68,68,.1)' : 'none', transition:'background .1s' }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(239,68,68,.04)'}
                onMouseLeave={e => e.currentTarget.style.background='none'}>
                <div style={{ width:42, height:42, borderRadius:10, background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.2)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <span style={{ fontSize:13, fontWeight:800, color:'#f87171', lineHeight:1 }}>{parseLocalDate(s.data_scadenza).getDate()}</span>
                  <span style={{ fontSize:8.5, fontWeight:700, color:'#f87171', textTransform:'uppercase', letterSpacing:'.05em', opacity:.8 }}>{parseLocalDate(s.data_scadenza).toLocaleString('it-IT',{month:'short'})}</span>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13.5, fontWeight:600, color:'var(--text2)', letterSpacing:'-.01em' }}>{s.titolo}</div>
                  <div style={{ fontSize:11.5, color:'var(--text4)', marginTop:2, display:'flex', gap:10, flexWrap:'wrap' }}>
                    <span style={{ color:'#f87171', fontWeight:600 }}>Scaduta {giorni} giorni fa</span>
                    {cliente && <span>{cliente}</span>}
                    {s.importo > 0 && <span style={{ color:'#fbbf24' }}>€{parseFloat(s.importo).toLocaleString('it-IT')}</span>}
                  </div>
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <button onClick={() => segnaCompletata(s.id, s.titolo)} className="btn btn-green" style={{ padding:'5px 12px', fontSize:12 }}>
                    <Check size={12} /> Completata
                  </button>
                  <button onClick={() => eliminaScadenza(s.id)} className="btn btn-ghost" style={{ padding:'5px 8px' }}>
                    <X size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* KPI mini row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
        {[
          { key:'urgenti',  label:'Urgenti (≤2gg)',     count:urgenti,  color:'#ef4444', Icon:AlertTriangle },
          { key:'prossime', label:'Questa settimana',   count:prossime, color:'#f97316', Icon:Clock },
          { key:'arrivo',   label:'Prossimi 30 giorni', count:inArrivo, color:'#3b82f6', Icon:Calendar },
        ].map(k => (
          <button key={k.key} onClick={() => setFiltro(filtro === k.key ? 'tutte' : k.key)} style={{
            display:'flex', alignItems:'center', gap:12, padding:'14px 16px',
            background: filtro===k.key ? k.color+'14' : 'var(--bg3)',
            border:`1px solid ${filtro===k.key ? k.color+'35' : 'var(--border2)'}`,
            borderRadius:12, cursor:'pointer', fontFamily:'inherit', transition:'all .15s', textAlign:'left',
          }}>
            <div style={{ width:36, height:36, borderRadius:9, background:k.color+'14', border:`1px solid ${k.color}22`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <k.Icon size={16} color={k.color} />
            </div>
            <div>
              <div style={{ fontSize:22, fontWeight:800, color:k.count>0?k.color:'var(--text1)', letterSpacing:'-.05em', lineHeight:1 }}>{k.count}</div>
              <div style={{ fontSize:11.5, color:'var(--text4)', marginTop:3 }}>{k.label}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        {[
          { k:'tutte',   l:`Tutte (${scadenze.length})` },
          { k:'urgenti', l:`Urgenti (${urgenti})` },
          { k:'prossime',l:`Questa settimana (${prossime})` },
          { k:'arrivo',  l:`In arrivo (${inArrivo})` },
        ].map(f => (
          <button key={f.k} className={`tab-item${filtro===f.k?' tab-active':''}`} onClick={() => setFiltro(f.k)}>{f.l}</button>
        ))}
      </div>

      {/* Lista scadenze prossime */}
      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><CheckCircle2 size={36} color="#22c55e" style={{ opacity:1 }} /></div>
            <div className="empty-state-title">Nessuna scadenza in questa categoria</div>
            <div className="empty-state-sub">Tutto in ordine 🎉</div>
          </div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {filtered.map(s => {
            const u = urgenza(s.data_scadenza)
            const cliente = nomeC(s.clienti)
            return (
              <div key={s.id} style={{ background:u.dim, border:`1px solid ${u.border}`, borderRadius:12, padding:'15px 18px', display:'flex', alignItems:'center', gap:15, transition:'transform .12s, box-shadow .12s' }}
                onMouseEnter={e => { e.currentTarget.style.transform='translateX(2px)'; e.currentTarget.style.boxShadow=`0 4px 20px ${u.color}18` }}
                onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='' }}>
                <div style={{ width:46, height:46, borderRadius:11, background:u.color+'15', border:`1px solid ${u.color}25`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <span style={{ fontSize:16, fontWeight:800, color:u.color, lineHeight:1 }}>{parseLocalDate(s.data_scadenza).getDate()}</span>
                  <span style={{ fontSize:9, fontWeight:700, color:u.color, textTransform:'uppercase', letterSpacing:'.05em', opacity:.8 }}>{parseLocalDate(s.data_scadenza).toLocaleString('it-IT',{month:'short'})}</span>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                    <span style={{ fontSize:14, fontWeight:600, color:'var(--text1)', letterSpacing:'-.02em' }}>{s.titolo}</span>
                    <span style={{ fontSize:10.5, fontWeight:700, color:u.color, background:u.color+'18', padding:'2px 8px', borderRadius:99, border:`1px solid ${u.color}25` }}>
                      {u.giorni === 0 ? 'Oggi!' : u.giorni === 1 ? 'Domani' : `${u.giorni} giorni`}
                    </span>
                  </div>
                  <div style={{ display:'flex', gap:14, fontSize:11.5, color:'var(--text4)', flexWrap:'wrap', alignItems:'center' }}>
                    <span style={{ display:'flex', alignItems:'center', gap:4 }}><Calendar size={11}/>{format(parseLocalDate(s.data_scadenza),'EEEE d MMMM',{locale:it})}</span>
                    {s.importo > 0 && <span style={{ display:'flex', alignItems:'center', gap:4, color:'#fbbf24', fontWeight:600 }}><Euro size={11}/>€{parseFloat(s.importo).toLocaleString('it-IT')}</span>}
                    {cliente && <span style={{ display:'flex', alignItems:'center', gap:4 }}><ChevronRight size={10}/>{cliente}</span>}
                    {s.descrizione && <span style={{ color:'var(--text4)', fontStyle:'italic' }}>{s.descrizione}</span>}
                  </div>
                </div>
                <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                  <button onClick={() => eliminaScadenza(s.id)} className="btn btn-ghost" style={{ padding:'6px 8px' }}>
                    <X size={13} />
                  </button>
                  <button onClick={() => segnaCompletata(s.id, s.titolo)} className="btn btn-green" style={{ padding:'7px 16px', fontSize:12.5 }}>
                    <Check size={13} /> Completata
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal nuova scadenza */}
      {modal && (
        <div style={{ position:"fixed", inset:0, zIndex:100, background:"rgba(5,8,20,.82)", backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)", overflow:"hidden", display:"block" }} onClick={() => setModal(false)}>
          <div style={{ background:"var(--bg3)", border:"1px solid var(--border3)", borderRadius:16, width:"100%", maxWidth:540, margin:"32px auto", boxShadow:"0 40px 100px rgba(0,0,0,.7)" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding:"18px 22px", borderBottom:"1px solid var(--border2)", display:"flex", alignItems:"center", justifyContent:"space-between", borderRadius:"16px 16px 0 0" }}>
              <div>
                <h2 style={{ fontSize:15.5, fontWeight:700, color:'var(--text1)' }}>Nuova scadenza</h2>
                <p style={{ fontSize:12, color:'var(--text4)', marginTop:2 }}>Aggiungi una scadenza al calendario</p>
              </div>
              <button onClick={() => setModal(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text4)', display:'flex' }}><X size={15}/></button>
            </div>
            <div style={{ padding:"20px 22px", display:"flex", flexDirection:"column", gap:14 }}>
              <div>
                <label className="lbl">Titolo *</label>
                <input className="inp" autoFocus value={form.titolo} onChange={e => setForm(f=>({...f,titolo:e.target.value}))} placeholder="Es. Versamento IVA trimestrale" />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label className="lbl">Data scadenza *</label>
                  <input className="inp" type="date" value={form.data_scadenza} onChange={e => setForm(f=>({...f,data_scadenza:e.target.value}))} />
                </div>
                <div>
                  <label className="lbl">Tipo</label>
                  <select className="inp" value={form.tipo} onChange={e => setForm(f=>({...f,tipo:e.target.value}))}>
                    {['scadenza','rata','dichiarazione','versamento','altro'].map(t => (
                      <option key={t} value={t} style={{ textTransform:'capitalize' }}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label className="lbl">Cliente</label>
                  <select className="inp" value={form.cliente_id} onChange={e => setForm(f=>({...f,cliente_id:e.target.value}))}>
                    <option value="">— Nessuno —</option>
                    {clienti.map(c => <option key={c.id} value={c.id}>{c.ragione_sociale||`${c.nome||''} ${c.cognome||''}`.trim()}</option>)}
                  </select>
                </div>
                <div>
                  <label className="lbl">Importo (€)</label>
                  <input className="inp" type="number" step="0.01" min="0" value={form.importo} onChange={e => setForm(f=>({...f,importo:e.target.value}))} placeholder="Opzionale" />
                </div>
              </div>
              <div>
                <label className="lbl">Descrizione <span style={{ color:'var(--text4)', fontWeight:400 }}>(opzionale)</span></label>
                <input className="inp" value={form.descrizione} onChange={e => setForm(f=>({...f,descrizione:e.target.value}))} placeholder="Breve nota" />
              </div>
            </div>
            <div style={{ padding:"14px 22px", borderTop:"1px solid var(--border2)", display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Annulla</button>
              <button className="btn btn-primary" onClick={salvaScadenza} disabled={saving || !form.titolo.trim() || !form.data_scadenza}>
                {saving ? 'Salvo...' : <><Plus size={13}/> Aggiungi scadenza</>}
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
    </div>
  )
}
