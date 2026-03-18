import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { usePagina } from '../hooks/usePagina'
import ConfirmDialog from '../components/ConfirmDialog'
import { Search, Check, RotateCcw, Landmark, AlertCircle, X, Users, Clock, UserX, Trash2 } from 'lucide-react'
import Modal from '../components/Modal'

export default function Cassa() {
  const [clienti, setClienti]         = useState([])
  const [esclusi, setEsclusi]         = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('cassa_esclusi') || '[]')) }
    catch { return new Set() }
  })
  const [registrazioni, setRegistrazioni] = useState([])
  const [q, setQ]                     = useState('')
  const [data, setData]               = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(null)
  const [error, setError]             = useState(null)
  const [modalEscludi, setModalEscludi] = useState(false)
  const [filtro, setFiltro]           = useState('attivi') // attivi | tutti
  const [confirm, setConfirm]         = useState(null)
  usePagina('Registro Cassa')

  useEffect(() => { load() }, [])
  useEffect(() => { loadRegistrazioni() }, [data])

  async function load(){
    try {
    const { data:c, error:e } = await supabase
      .from('clienti')
      .select('id,ragione_sociale,nome,cognome,codice_fiscale,partita_iva,tipo')
    if (e) { setError('Errore: '+e.message); setLoading(false); return }
    setClienti(c||[]);
    } catch(e) {
      console.error('Errore caricamento:', e)
    } finally {
      setLoading(false)
    }
  }

  async function loadRegistrazioni() {
    const { data:r, error:e } = await supabase
      .from('registrazioni_cassa')
      .select('cliente_id,ora_registrazione')
      .eq('data', data)
    if (e) { setError('Errore: '+e.message); return }
    setRegistrazioni(r||[])
  }

  function salvaEsclusi(nuovoSet) {
    setEsclusi(nuovoSet)
    localStorage.setItem('cassa_esclusi', JSON.stringify([...nuovoSet]))
  }

  function toggleEscludi(id) {
    const nuovo = new Set(esclusi)
    if (nuovo.has(id)) nuovo.delete(id)
    else nuovo.add(id)
    salvaEsclusi(nuovo)
  }

  const label = c => c.ragione_sociale || `${c.nome||''} ${c.cognome||''}`.trim() || '—'
  const isReg = id => registrazioni.some(r => r.cliente_id===id)
  const oraReg = id => registrazioni.find(r => r.cliente_id===id)?.ora_registrazione

  async function toggle(id) {
    setSaving(id); setError(null)
    if (isReg(id)) {
      const { error:e } = await supabase.from('registrazioni_cassa').delete().eq('cliente_id',id).eq('data',data)
      if (e) setError('Errore: '+e.message)
    } else {
      const ora = new Date().toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})
      const { error:e } = await supabase.from('registrazioni_cassa').insert([{ cliente_id:id, data, ora_registrazione:ora }])
      if (e) setError('Errore: '+e.message)
    }
    await loadRegistrazioni(); setSaving(null)
  }

  async function resetGiorno() {
    setConfirm({ msg: 'Resettare tutte le spunte del giorno? Le registrazioni saranno eliminate.', danger: false, okLabel: 'Resetta', onOk: () => _doReset() })
    return
  }
  async function _doReset() {
    await supabase.from('registrazioni_cassa').delete().eq('data', data)
    await loadRegistrazioni()
  }

  function rimuoviDaLista(c) {
    setConfirm({
      msg: `Rimuovere "${label(c)}" dalla lista cassa? Puoi reintegrarlo dalla gestione lista.`,
      danger: true,
      okLabel: 'Rimuovi',
      onOk: () => {
        const nuovo = new Set(esclusi)
        nuovo.add(c.id)
        salvaEsclusi(nuovo)
      }
    })
  }

  // Clienti visibili (esclusi i senza uso registratore)
  const clientiAttivi = filtro === 'attivi'
    ? clienti.filter(c => !esclusi.has(c.id))
    : clienti

  const filtered = clientiAttivi.filter(c => {
    if (!q) return true
    const s = q.toLowerCase()
    return label(c).toLowerCase().includes(s) ||
      (c.codice_fiscale||'').toLowerCase().includes(s) ||
      (c.partita_iva||'').toLowerCase().includes(s)
  })

  const totReg = filtered.filter(c => isReg(c.id)).length
  const perc   = filtered.length ? Math.round((totReg/filtered.length)*100) : 0
  const isOggi = data === new Date().toISOString().split('T')[0]

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:240 }}><div className="spinner" style={{ width:28, height:28 }}/></div>

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
        <div>
          <h1 className="page-title">Registro Cassa</h1>
          <p style={{ fontSize:12.5, color:'var(--text4)', marginTop:3 }}>
            Presenza clienti AdE · {isOggi ? 'Oggi' : new Date(data+'T12:00').toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long'})}
          </p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          <input type="date" value={data} onChange={e => setData(e.target.value)} className="inp" style={{ width:160 }} />
          <button className="btn btn-outline" onClick={() => setModalEscludi(true)} style={{ fontSize:12.5 }}>
            <UserX size={13}/> Gestisci lista ({esclusi.size} esclusi)
          </button>
          <button className="btn btn-ghost" onClick={resetGiorno} style={{ padding:'7px 12px' }}>
            <RotateCcw size={13}/> Reset
          </button>
        </div>
      </div>

      {error && (
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', background:'var(--red-dim)', border:'1px solid rgba(239,68,68,.2)', borderRadius:9, fontSize:13, color:'#f87171' }}>
          <AlertCircle size={14}/> {error}
          <button onClick={() => setError(null)} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:'#f87171', display:'flex' }}><X size={13}/></button>
        </div>
      )}

      {/* KPI */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
        <div className="card" style={{ padding:'16px 20px' }}>
          <div style={{ width:34, height:34, borderRadius:9, background:'var(--green-dim)', border:'1px solid rgba(34,197,94,.2)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:10 }}>
            <Check size={15} color="#4ade80"/>
          </div>
          <div style={{ fontSize:30, fontWeight:800, color:'var(--text1)', letterSpacing:'-.05em', lineHeight:1 }}>{totReg}</div>
          <div style={{ fontSize:12, color:'var(--text4)', marginTop:5 }}>Registrati oggi</div>
        </div>
        <div className="card" style={{ padding:'16px 20px' }}>
          <div style={{ width:34, height:34, borderRadius:9, background:'var(--amber-dim)', border:'1px solid rgba(245,158,11,.2)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:10 }}>
            <Users size={15} color="var(--amber2)"/>
          </div>
          <div style={{ fontSize:30, fontWeight:800, color:'var(--text1)', letterSpacing:'-.05em', lineHeight:1 }}>{filtered.length-totReg}</div>
          <div style={{ fontSize:12, color:'var(--text4)', marginTop:5 }}>Da registrare</div>
        </div>
        <div className="card" style={{ padding:'16px 20px' }}>
          <div style={{ width:34, height:34, borderRadius:9, background:perc===100?'var(--green-dim)':'var(--blue-dim)', border:`1px solid ${perc===100?'rgba(34,197,94,.2)':'rgba(59,130,246,.2)'}`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:10 }}>
            <Landmark size={15} color={perc===100?'#4ade80':'var(--blue2)'}/>
          </div>
          <div style={{ fontSize:30, fontWeight:800, color:perc===100?'#4ade80':'var(--text1)', letterSpacing:'-.05em', lineHeight:1 }}>{perc}%</div>
          <div style={{ fontSize:12, color:'var(--text4)', marginTop:5, marginBottom:8 }}>Completamento</div>
          <div className="progress"><div className="progress-inner" style={{ width:`${perc}%` }}/></div>
        </div>
      </div>

      {/* Filtro + Ricerca */}
      <div style={{ display:'flex', gap:10, alignItems:'center' }}>
        <div style={{ position:'relative', flex:1, maxWidth:420 }}>
          <Search size={13} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'var(--text4)', pointerEvents:'none' }}/>
          <input className="inp" style={{ paddingLeft:34 }} value={q} onChange={e => setQ(e.target.value)} placeholder="Cerca cliente, CF, P.IVA..." />
          {q && <button onClick={() => setQ('')} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--text4)', display:'flex' }}><X size={13}/></button>}
        </div>
        <div className="tab-bar" style={{ marginBottom:0 }}>
          <button className={`tab-item${filtro==='attivi'?' tab-active':''}`} onClick={() => setFiltro('attivi')}>
            Lista attiva ({clienti.length - esclusi.size})
          </button>
          <button className={`tab-item${filtro==='tutti'?' tab-active':''}`} onClick={() => setFiltro('tutti')}>
            Tutti ({clienti.length})
          </button>
        </div>
      </div>

      {/* Tabella */}
      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr>
              <th className="th">Cliente</th>
              <th className="th">CF / P.IVA</th>
              <th className="th" style={{ textAlign:'right' }}>Ora registrazione</th>
              <th className="th" style={{ width:80, textAlign:'center' }}>Presente</th>
              <th className="th" style={{ width:44 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => {
              const reg = isReg(c.id)
              const ora = oraReg(c.id)
              const isSavingThis = saving===c.id
              const escluso = esclusi.has(c.id)
              return (
                <tr key={c.id} className="tr"
                  onClick={() => !isSavingThis && !escluso && toggle(c.id)}
                  style={{ cursor: isSavingThis||escluso ? 'default':'pointer', background:reg?'rgba(34,197,94,0.04)':escluso?'rgba(0,0,0,.15)':undefined, opacity:escluso?.5:1 }}>
                  <td className="td">
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:32, height:32, borderRadius:8, background: reg?'var(--green-dim)':'var(--bg4)', border:`1px solid ${reg?'rgba(34,197,94,.2)':'var(--border2)'}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        {reg ? <Check size={13} color="#4ade80"/> : <span style={{ fontSize:11, fontWeight:700, color:'var(--text4)' }}>{label(c)[0]}</span>}
                      </div>
                      <div>
                        <span style={{ fontSize:13.5, fontWeight:600, color:reg?'#4ade80':'var(--text1)', letterSpacing:'-.02em' }}>{label(c)}</span>
                        {escluso && <span style={{ fontSize:10, color:'var(--text4)', marginLeft:8 }}>(escluso)</span>}
                      </div>
                    </div>
                  </td>
                  <td className="td">
                    <div style={{ fontFamily:'monospace', fontSize:12, color:'var(--text3)' }}>
                      {c.codice_fiscale||'—'}
                      {c.partita_iva && <div style={{ fontSize:11, color:'var(--text4)', marginTop:1 }}>IVA {c.partita_iva}</div>}
                    </div>
                  </td>
                  <td className="td" style={{ textAlign:'right' }}>
                    {ora ? <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:12, color:'#4ade80', fontWeight:600 }}><Clock size={11}/>{ora}</span>
                         : <span style={{ fontSize:12, color:'var(--text4)' }}>—</span>}
                  </td>
                  <td className="td" style={{ textAlign:'center' }}>
                    {isSavingThis ? (
                      <div className="spinner" style={{ width:16, height:16, margin:'0 auto' }}/>
                    ) : (
                      <div style={{ width:28, height:28, borderRadius:7, margin:'0 auto', background:reg?'rgba(34,197,94,.12)':'var(--bg4)', border:`1px solid ${reg?'rgba(34,197,94,.3)':'var(--border2)'}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        {reg && <Check size={14} color="#4ade80"/>}
                      </div>
                    )}
                  </td>
                  <td className="td" style={{ textAlign:'center' }}>
                    <button
                      onClick={e => { e.stopPropagation(); rimuoviDaLista(c) }}
                      title="Rimuovi dalla lista cassa"
                      style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text4)', display:'flex', alignItems:'center', justifyContent:'center', padding:4, borderRadius:5, transition:'color .12s' }}
                      onMouseEnter={e => e.currentTarget.style.color='#f87171'}
                      onMouseLeave={e => e.currentTarget.style.color='var(--text4)'}>
                      <Trash2 size={13}/>
                    </button>
                  </td>
                </tr>
              )
            })}
            {filtered.length===0 && <tr><td colSpan={4} style={{ padding:'40px', textAlign:'center', color:'var(--text4)', fontSize:13 }}>Nessun cliente trovato</td></tr>}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize:11.5, color:'var(--text4)', textAlign:'center' }}>💾 Sincronizzato su Supabase · accessibile da qualsiasi dispositivo</p>

      {/* Modal gestione esclusi */}
      {modalEscludi && (
        <div style={{ position:"fixed", inset:0, zIndex:100, background:"rgba(5,8,20,.82)", backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)", overflow:"hidden", display:"block" }} onClick={() => setModalEscludi(false)}>
          <div style={{ background:"var(--bg3)", border:"1px solid var(--border3)", borderRadius:16, width:"100%", maxWidth:540, margin:"32px auto", boxShadow:"0 40px 100px rgba(0,0,0,.7)" }} style={{ maxWidth:520 }} onClick={e => e.stopPropagation()}>
            <div style={{ padding:"18px 22px", borderBottom:"1px solid var(--border2)", display:"flex", alignItems:"center", justifyContent:"space-between", borderRadius:"16px 16px 0 0" }}>
              <div>
                <h2 style={{ fontSize:15.5, fontWeight:700, color:'var(--text1)', letterSpacing:'-.03em' }}>Gestisci lista cassa</h2>
                <p style={{ fontSize:12, color:'var(--text4)', marginTop:2 }}>Escludi i clienti che non usano il registratore telematico</p>
              </div>
              <button onClick={() => setModalEscludi(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text4)', display:'flex' }}><X size={15}/></button>
            </div>
            <div style={{ maxHeight:420, overflowY:'auto', padding:'8px' }}>
              {clienti.map(c => {
                const escluso = esclusi.has(c.id)
                return (
                  <button key={c.id} onClick={() => toggleEscludi(c.id)}
                    style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'10px 12px', borderRadius:9, background: escluso ? 'rgba(239,68,68,.06)' : 'transparent', border:`1px solid ${escluso?'rgba(239,68,68,.2)':'transparent'}`, cursor:'pointer', fontFamily:'inherit', marginBottom:3, transition:'all .12s' }}
                    onMouseEnter={e => !escluso && (e.currentTarget.style.background='var(--bg4)')}
                    onMouseLeave={e => !escluso && (e.currentTarget.style.background='transparent')}>
                    <div style={{ width:32, height:32, borderRadius:8, background:escluso?'var(--red-dim)':'var(--bg4)', border:`1px solid ${escluso?'rgba(239,68,68,.2)':'var(--border2)'}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:11, fontWeight:700, color:escluso?'#f87171':'var(--text4)' }}>
                      {escluso ? <UserX size={14}/> : label(c)[0]}
                    </div>
                    <div style={{ flex:1, textAlign:'left' }}>
                      <div style={{ fontSize:13.5, fontWeight:600, color:escluso?'var(--text4)':'var(--text1)', textDecoration:escluso?'line-through':'none' }}>{label(c)}</div>
                      <div style={{ fontSize:11, color:'var(--text4)', marginTop:1 }}>{c.tipo==='societa'?'Società':'Persona fisica'}{c.codice_fiscale?' · '+c.codice_fiscale:''}</div>
                    </div>
                    <span style={{ fontSize:11.5, fontWeight:600, color:escluso?'#f87171':'var(--text4)' }}>
                      {escluso ? '✗ Escluso' : 'Includi'}
                    </span>
                  </button>
                )
              })}
            </div>
            <div style={{ padding:"14px 22px", borderTop:"1px solid var(--border2)", display:"flex", gap:8, justifyContent:"flex-end" }} style={{ justifyContent:'space-between' }}>
              <span style={{ fontSize:12, color:'var(--text4)' }}>{esclusi.size} clienti esclusi · salvato in locale</span>
              <button className="btn btn-primary" onClick={() => setModalEscludi(false)}>Fatto</button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
    </div>
  )
}
