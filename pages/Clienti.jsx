import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import { usePagina } from '../hooks/usePagina'
import ConfirmDialog from '../components/ConfirmDialog'
import { Plus, Search, ChevronRight, User, Building2, X, Users, Filter } from 'lucide-react'
import Modal from '../components/Modal'

const TIPI_SOCIETA = [
  { v: 'srl',   l: 'S.R.L.' },
  { v: 'srls',  l: 'S.R.L.S.' },
  { v: 'sas',   l: 'S.A.S.' },
  { v: 'snc',   l: 'S.N.C.' },
  { v: 'spa',   l: 'S.P.A.' },
  { v: 'sapa',  l: 'S.A.P.A.' },
  { v: 'ss',    l: 'S.S.' },
  { v: 'ditta', l: 'Ditta Individuale' },
  { v: 'altro', l: 'Altra forma' },
]

const VUOTO = {
  tipo: 'persona_fisica',
  forma_societaria: '',
  ragione_sociale: '',
  nome: '', cognome: '',
  codice_fiscale: '', partita_iva: '',
  telefono: '', email: '',
  indirizzo: '',
  regime_fiscale: 'ordinario',
  stato: 'attivo', note: ''
}

function badgeTipo(c) {
  if (c.tipo === 'persona_fisica') return { label: 'Persona fisica', cls: 'badge-purple' }
  const fs = TIPI_SOCIETA.find(t => t.v === c.forma_societaria)
  return { label: fs ? fs.l : 'Società', cls: 'badge-blue' }
}

export default function Clienti() {
  const navigate = useNavigate()
  const toast = useToast()
  const [clienti, setClienti]     = useState([])
  const [q, setQ]                 = useState('')
  const [filtroTipo, setFiltroTipo] = useState('') // '' | 'persona_fisica' | 'srl' | 'sas' ...
  const [modal, setModal]         = useState(false)
  const [form, setForm]           = useState(VUOTO)
  const [saving, setSaving]       = useState(false)
  const [err, setErr]             = useState('')
  const [sortBy, setSortBy]       = useState('nome')
  const [sortDir, setSortDir]     = useState('asc')
  const [loading, setLoading]     = useState(true)
  const [confirm, setConfirm]     = useState(null)
  const primoRef = useRef(null)

  usePagina('Clienti', modal, () => setModal(false))

  useEffect(() => { load() }, [])
  useEffect(() => { if (modal) setTimeout(() => primoRef.current?.focus(), 80) }, [modal])

  async function load() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('clienti')
        .select('id,ragione_sociale,nome,cognome,codice_fiscale,partita_iva,telefono,email,tipo,forma_societaria,stato,regime_fiscale')
      if (error) throw error
      const sorted = (data || []).sort((a, b) => {
        const la = (a.ragione_sociale || `${a.cognome || ''} ${a.nome || ''}`).trim().toLowerCase()
        const lb = (b.ragione_sociale || `${b.cognome || ''} ${b.nome || ''}`).trim().toLowerCase()
        return la.localeCompare(lb, 'it')
      })
      setClienti(sorted)
    } catch (e) {
      console.error('Errore caricamento clienti:', e)
    } finally {
      setLoading(false)
    }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function save() {
    setErr('')
    const nome = form.tipo === 'societa' ? form.ragione_sociale : (form.cognome || form.nome)
    if (!nome?.trim()) { setErr('Inserisci almeno il nome o la ragione sociale.'); return }
    if (form.tipo === 'societa' && !form.forma_societaria) { setErr('Seleziona la forma societaria.'); return }
    setSaving(true)
    const { error } = await supabase.from('clienti').insert([{
      ...form,
      tipo: form.tipo === 'persona_fisica' ? 'persona_fisica' : 'societa',
      codice_fiscale: (form.codice_fiscale || '').toUpperCase()
    }])
    if (error) { setErr('Errore: ' + error.message); setSaving(false); return }
    toast('Cliente aggiunto', 'success')
    setSaving(false); setModal(false); setForm(VUOTO); load()
  }

  const label = c => c.ragione_sociale || `${c.nome||''} ${c.cognome||''}`.trim() || '—'

  const filtered = useMemo(() => {
    let res = clienti
    if (filtroTipo === 'persona_fisica') res = res.filter(c => c.tipo === 'persona_fisica')
    else if (filtroTipo === 'societa') res = res.filter(c => c.tipo === 'societa')
    else if (filtroTipo) res = res.filter(c => c.forma_societaria === filtroTipo)
    if (q) {
      const s = q.toLowerCase()
      res = res.filter(c =>
        label(c).toLowerCase().includes(s) ||
        (c.codice_fiscale||'').toLowerCase().includes(s) ||
        (c.partita_iva||'').toLowerCase().includes(s) ||
        (c.telefono||'').includes(s) ||
        (c.email||'').toLowerCase().includes(s)
      )
    }
    return [...res].sort((a, b) => {
      let va = '', vb = ''
      if (sortBy === 'nome')   { va = label(a).toLowerCase();   vb = label(b).toLowerCase() }
      if (sortBy === 'cf')     { va = a.codice_fiscale||'';     vb = b.codice_fiscale||'' }
      if (sortBy === 'regime') { va = a.regime_fiscale||'';     vb = b.regime_fiscale||'' }
      if (sortBy === 'stato')  { va = a.stato||'';              vb = b.stato||'' }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [clienti, q, filtroTipo, sortBy, sortDir])

  function toggleSort(col) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('asc') }
  }
  const ArrowSort = ({ col }) => (
    <span style={{ marginLeft:4, fontSize:9, color: sortBy===col ? 'var(--blue2)' : 'var(--text4)' }}>
      {sortBy===col ? (sortDir==='asc' ? '↑' : '↓') : '⇅'}
    </span>
  )

  // Conteggi per filtri
  const counts = useMemo(() => {
    const c = { tutti: clienti.length, persona_fisica: 0, societa: 0 }
    TIPI_SOCIETA.forEach(t => { c[t.v] = 0 })
    clienti.forEach(cl => {
      if (cl.tipo === 'persona_fisica') c.persona_fisica++
      else {
        c.societa++
        if (cl.forma_societaria && c[cl.forma_societaria] !== undefined) c[cl.forma_societaria]++
      }
    })
    return c
  }, [clienti])

  const FILTRI = [
    { v: '',               l: 'Tutti',         n: counts.tutti },
    { v: 'persona_fisica', l: 'Persone fisiche', n: counts.persona_fisica },
    { v: 'societa',        l: 'Tutte le società', n: counts.societa },
    ...TIPI_SOCIETA.filter(t => counts[t.v] > 0).map(t => ({ v: t.v, l: t.l, n: counts[t.v] })),
  ]

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 12 }}>
      <div className="spinner" style={{ width: 26, height: 26 }} />
      <div style={{ fontSize: 12.5, color: 'var(--text4)' }}>Caricamento clienti...</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div>
          <h1 className="page-title">Clienti</h1>
          <p style={{ fontSize: 12.5, color: 'var(--text4)', marginTop: 3 }}>
            {clienti.length} totali · {filtered.length} mostrati
          </p>
        </div>
        <button onClick={() => { setForm(VUOTO); setErr(''); setModal(true) }} className="btn btn-gold" style={{ marginLeft: 'auto' }}>
          <Plus size={14} /> Nuovo cliente
        </button>
      </div>

      {/* Ricerca */}
      <div style={{ position: 'relative', maxWidth: 460 }}>
        <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text4)', pointerEvents: 'none' }} />
        <input className="inp" style={{ paddingLeft: 34 }} value={q} onChange={e => setQ(e.target.value)}
          placeholder="Cerca per nome, CF, P.IVA, email..." />
        {q && <button onClick={() => setQ('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text4)', display: 'flex' }}><X size={13} /></button>}
      </div>

      {/* Filtri tipo */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <Filter size={12} color="var(--text4)" />
        {FILTRI.map(f => (
          <button key={f.v} onClick={() => setFiltroTipo(f.v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 11px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all .12s',
              border: `1px solid ${filtroTipo === f.v ? 'var(--blue)' : 'var(--border2)'}`,
              background: filtroTipo === f.v ? 'var(--blue-dim)' : 'var(--bg3)',
              color: filtroTipo === f.v ? 'var(--blue2)' : 'var(--text3)',
            }}>
            {f.l}
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99,
              background: filtroTipo === f.v ? 'var(--blue)' : 'var(--bg4)',
              color: filtroTipo === f.v ? '#fff' : 'var(--text4)',
            }}>{f.n}</span>
          </button>
        ))}
      </div>

      {/* Tabella */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th className="th" style={{ cursor:'pointer', userSelect:'none' }} onClick={() => toggleSort('nome')}>Cliente<ArrowSort col="nome"/></th>
              <th className="th">Tipo</th>
              <th className="th" style={{ cursor:'pointer', userSelect:'none' }} onClick={() => toggleSort('cf')}>CF / P.IVA<ArrowSort col="cf"/></th>
              <th className="th">Contatti</th>
              <th className="th" style={{ cursor:'pointer', userSelect:'none' }} onClick={() => toggleSort('regime')}>Regime<ArrowSort col="regime"/></th>
              <th className="th" style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => {
              const badge = badgeTipo(c)
              return (
                <tr key={c.id} className="tr" style={{ cursor: 'pointer' }} onClick={() => navigate(`/clienti/${c.id}`)}>
                  <td className="td">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 9,
                        background: c.tipo === 'societa' ? 'var(--blue-dim)' : 'var(--purple-dim)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        border: `1px solid ${c.tipo === 'societa' ? 'var(--blue-glow)' : 'rgba(168,85,247,.2)'}` }}>
                        {c.tipo === 'societa' ? <Building2 size={14} color="var(--blue2)" /> : <User size={14} color="#d8b4fe" />}
                      </div>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text1)', letterSpacing: '-.02em' }}>{label(c)}</div>
                        {c.email && <div style={{ fontSize: 11.5, color: 'var(--text4)', marginTop: 1 }}>{c.email}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="td">
                    <span className={`badge ${badge.cls}`}>{badge.label}</span>
                  </td>
                  <td className="td">
                    <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text3)', lineHeight: 1.7 }}>
                      {c.codice_fiscale && <div style={{ letterSpacing: '.04em' }}>{c.codice_fiscale}</div>}
                      {c.partita_iva && <div style={{ color: 'var(--text4)' }}>IVA {c.partita_iva}</div>}
                      {!c.codice_fiscale && !c.partita_iva && <span style={{ color: 'var(--text4)' }}>—</span>}
                    </div>
                  </td>
                  <td className="td" style={{ fontSize: 12.5, color: 'var(--text3)' }}>
                    {c.telefono && <div>{c.telefono}</div>}
                    {!c.telefono && <span style={{ color: 'var(--text4)' }}>—</span>}
                  </td>
                  <td className="td">
                    {c.regime_fiscale
                      ? <span className="badge badge-gray" style={{ textTransform: 'capitalize' }}>{c.regime_fiscale}</span>
                      : <span style={{ color: 'var(--text4)' }}>—</span>}
                  </td>
                  <td className="td"><ChevronRight size={14} color="var(--text4)" /></td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={6}>
                <div className="empty-state">
                  <div className="empty-state-icon"><Users size={32} /></div>
                  <div className="empty-state-title">{q || filtroTipo ? 'Nessun cliente trovato' : 'Nessun cliente'}</div>
                  <div className="empty-state-sub">{q ? `Nessun risultato per "${q}"` : 'Aggiungi il primo cliente'}</div>
                </div>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal nuovo cliente */}
      {modal && (
        <div style={{ position:"fixed", inset:0, zIndex:100, background:"rgba(5,8,20,.82)", backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)", overflow:"hidden", display:"block" }} onClick={() => setModal(false)}>
          <div style={{ background:"var(--bg3)", border:"1px solid var(--border3)", borderRadius:16, width:"100%", maxWidth:540, margin:"32px auto", boxShadow:"0 40px 100px rgba(0,0,0,.7)" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding:"18px 22px", borderBottom:"1px solid var(--border2)", display:"flex", alignItems:"center", justifyContent:"space-between", borderRadius:"16px 16px 0 0" }}>
              <div>
                <h2 style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--text1)', letterSpacing: '-.03em' }}>Nuovo cliente</h2>
                <p style={{ fontSize: 12, color: 'var(--text4)', marginTop: 2 }}>Compila i dati anagrafici</p>
              </div>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text4)', display: 'flex' }}><X size={15} /></button>
            </div>
            <div style={{ padding:"20px 22px", display:"flex", flexDirection:"column", gap:14 }}>

              {/* Tipo */}
              <div style={{ display: 'flex', gap: 6 }}>
                {[{ v: 'persona_fisica', l: '👤 Persona fisica' }, { v: 'societa', l: '🏢 Società / Ditta' }].map(t => (
                  <button key={t.v} onClick={() => set('tipo', t.v)} style={{
                    flex: 1, padding: '9px', borderRadius: 9,
                    border: `1px solid ${form.tipo === t.v ? 'var(--blue)' : 'var(--border3)'}`,
                    background: form.tipo === t.v ? 'var(--blue-dim)' : 'transparent',
                    color: form.tipo === t.v ? 'var(--blue2)' : 'var(--text3)',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
                  }}>{t.l}</button>
                ))}
              </div>

              {/* Forma societaria (solo per società) */}
              {form.tipo === 'societa' && (
                <div>
                  <label className="lbl">Forma societaria *</label>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 4 }}>
                    {TIPI_SOCIETA.map(t => (
                      <button key={t.v} onClick={() => set('forma_societaria', t.v)} style={{
                        padding: '5px 11px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                        cursor: 'pointer', fontFamily: 'inherit', transition: 'all .12s',
                        border: `1px solid ${form.forma_societaria === t.v ? 'var(--blue)' : 'var(--border2)'}`,
                        background: form.forma_societaria === t.v ? 'var(--blue-dim)' : 'var(--bg3)',
                        color: form.forma_societaria === t.v ? 'var(--blue2)' : 'var(--text3)',
                      }}>{t.l}</button>
                    ))}
                  </div>
                </div>
              )}

              {/* Nome / Ragione sociale */}
              {form.tipo === 'societa' ? (
                <div>
                  <label className="lbl">Ragione sociale *</label>
                  <input ref={primoRef} className="inp" value={form.ragione_sociale}
                    onChange={e => set('ragione_sociale', e.target.value)} placeholder="Es. ROSSI S.R.L." />
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div><label className="lbl">Nome</label>
                    <input ref={primoRef} className="inp" value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Mario" /></div>
                  <div><label className="lbl">Cognome *</label>
                    <input className="inp" value={form.cognome} onChange={e => set('cognome', e.target.value)} placeholder="Rossi" /></div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label className="lbl">Codice Fiscale</label>
                  <input className="inp" value={form.codice_fiscale}
                    onChange={e => set('codice_fiscale', e.target.value.toUpperCase())}
                    placeholder="RSSMRA80A01H501Z" maxLength={16}
                    style={{ fontFamily: 'monospace', letterSpacing: '.04em' }} /></div>
                <div><label className="lbl">Partita IVA</label>
                  <input className="inp" value={form.partita_iva}
                    onChange={e => set('partita_iva', e.target.value)}
                    placeholder="12345678901" maxLength={11} style={{ fontFamily: 'monospace' }} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label className="lbl">Telefono</label>
                  <input className="inp" type="tel" value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="333 1234567" /></div>
                <div><label className="lbl">Email</label>
                  <input className="inp" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="mario@email.it" /></div>
              </div>
              <div>
                <label className="lbl">Regime fiscale</label>
                <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                  {['ordinario', 'forfettario', 'semplificato'].map(r => (
                    <button key={r} onClick={() => set('regime_fiscale', r)} style={{
                      padding: '5px 12px', borderRadius: 20,
                      border: `1px solid ${form.regime_fiscale === r ? 'var(--blue)' : 'var(--border3)'}`,
                      background: form.regime_fiscale === r ? 'var(--blue-dim)' : 'transparent',
                      color: form.regime_fiscale === r ? 'var(--blue2)' : 'var(--text4)',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize',
                    }}>{r}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="lbl">Note <span style={{ color: 'var(--text4)', fontWeight: 400 }}>(opzionale)</span></label>
                <textarea className="inp" rows={2} value={form.note} onChange={e => set('note', e.target.value)}
                  placeholder="Informazioni aggiuntive..." style={{ resize: 'none' }} />
              </div>
              {err && <div style={{ padding: '9px 13px', background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 9, fontSize: 13, color: '#f87171' }}>{err}</div>}
            </div>
            <div style={{ padding:"14px 22px", borderTop:"1px solid var(--border2)", display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Annulla</button>
              <button className="btn btn-gold" onClick={save} disabled={saving}>
                {saving ? 'Salvo...' : <><Plus size={13} /> Salva cliente</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
    </div>
  )
}
