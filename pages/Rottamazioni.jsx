import { useState, useEffect } from 'react'
import { supabase, parseLocalDate } from '../lib/supabase'
import { usePagina } from '../hooks/usePagina'
import ConfirmDialog from '../components/ConfirmDialog'
import {Plus, X, Info, ChevronDown, ChevronUp, Trash2, AlertCircle, Check} from 'lucide-react'
import { format, addMonths, parseISO } from 'date-fns'
import Modal from '../components/Modal'

const OPT_PROSPETTO    = ['—', 'Da richiedere', 'Ricevuto ✓']
const OPT_CARTELLA     = ['—', 'Da fare', 'In corso', 'Completato ✓']
const OPT_ROTTAMAZIONE = ['—', 'Da fare', 'Presentata', 'Accettata ✓', 'Rifiutata']
const OPT_RATE         = ['—', 'Da fare', 'In pagamento', 'Completate ✓']

function coloreStatus(v) {
  if (!v || v === '—') return { bg: 'var(--bg4)', color: 'var(--text4)', border: 'var(--border2)' }
  if (v.includes('✓'))  return { bg: 'var(--green-dim)', color: 'var(--green2)', border: 'rgba(34,197,94,.2)' }
  if (v === 'In pagamento') return { bg: 'var(--amber-dim)', color: 'var(--amber2)', border: 'rgba(245,158,11,.2)' }
  if (v === 'Presentata')   return { bg: 'var(--blue-dim)',  color: 'var(--blue2)',  border: 'var(--blue-glow)' }
  if (v === 'Rifiutata')    return { bg: 'var(--red-dim)',   color: 'var(--red2)',   border: 'rgba(239,68,68,.2)' }
  return { bg: 'var(--bg3)', color: 'var(--text3)', border: 'var(--border2)' }
}

function DropSelect({ value, options, onChange }) {
  const [open, setOpen] = useState(false)
  const c = coloreStatus(value)
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
        padding: '5px 10px', borderRadius: 8, width: '100%',
        background: c.bg, color: c.color, border: `1.5px solid ${c.border}`,
        cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', transition: 'all .12s',
      }}>
        <span>{value || '—'}</span>
        <ChevronDown size={10} style={{ flexShrink: 0 }} />
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 19 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', top: '100%', left: 0, zIndex: 20, marginTop: 4,
            background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 10,
            padding: 5, minWidth: 180, boxShadow: '0 8px 28px rgba(0,0,0,.3)',
          }}>
            {options.map(o => {
              const oc = coloreStatus(o)
              return (
                <button key={o} onClick={() => { onChange(o); setOpen(false) }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', padding: '7px 11px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: 600, color: oc.color, borderRadius: 8,
                    fontFamily: 'inherit', transition: 'background .1s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = oc.bg}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                  {o}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

const VUOTO = { cliente_id: '', importo_totale: '', numero_rate: '18', data_prima_rata: '', note: '' }

function nomeC(c) {
  if (!c) return '—'
  return c.ragione_sociale || `${c.nome || ''} ${c.cognome || ''}`.trim() || '—'
}

function generaRate(form) {
  const nr = parseInt(form.numero_rate) || 18
  const tot = parseFloat(form.importo_totale) || 0
  const imp = Math.round(tot / nr * 100) / 100
  if (!form.data_prima_rata) return []
  const prima = parseISO(form.data_prima_rata)
  return Array.from({ length: nr }, (_, i) => ({
    numero: i + 1, importo: imp,
    data_scadenza: format(addMonths(prima, i * 2), 'yyyy-MM-dd'), pagata: false,
  }))
}

function progressoRiga(r) {
  const campi = [r.prospetto, r.cartella, r.rottamazione_stato]
  const completati = campi.filter(v => v && v.includes('✓')).length
  return Math.round((completati / campi.length) * 100)
}

export default function Rottamazioni({ clienteId = null }) {
  const [tab, setTab]         = useState('lavorazione')
  const [righe, setRighe]     = useState([])
  const [clienti, setClienti] = useState([])
  const [rateMap, setRateMap] = useState({})   // id rottamazione → rate[]
  const [aperto, setAperto]   = useState(null) // id rottamazione espansa in quinquies
  const [modal, setModal]     = useState(false)
  const [form, setForm]       = useState(VUOTO)
  const [saving, setSaving]   = useState(false)
  const [errore, setErrore]   = useState('')
  const [loading, setLoading] = useState(true)
  const [confirm, setConfirm] = useState(null)

  useEffect(() => { load() }, [clienteId])

  async function load() {
    setLoading(true)
    try {
      let q = supabase.from('rottamazioni')
        .select('*, clienti(id,ragione_sociale,nome,cognome,codice_fiscale)')
        .order('created_at', { ascending: false })
      if (clienteId) q = q.eq('cliente_id', clienteId)
      const [{ data: r, error: e1 }, { data: c, error: e2 }] = await Promise.all([
        q,
        supabase.from('clienti').select('id,ragione_sociale,nome,cognome,codice_fiscale'),
      ])
      if (e1) throw e1
      setRighe(r || [])
      setClienti(c || [])
    } catch(e) {
      console.error('Errore caricamento rottamazioni:', e)
    } finally {
      setLoading(false)
    }
  }

  async function caricaRate(id) {
    if (rateMap[id]) return // già caricate
    const { data } = await supabase.from('rate_rottamazione')
      .select('*').eq('rottamazione_id', id).order('numero')
    setRateMap(m => ({ ...m, [id]: data || [] }))
  }

  function toggleAperto(id) {
    if (aperto === id) { setAperto(null); return }
    setAperto(id)
    caricaRate(id)
  }

  async function togglePagata(rata, rottId) {
    const nuova = {
      pagata: !rata.pagata,
      data_pagamento: !rata.pagata ? new Date().toISOString().split('T')[0] : null,
    }
    await supabase.from('rate_rottamazione').update(nuova).eq('id', rata.id)
    setRateMap(m => ({
      ...m,
      [rottId]: m[rottId].map(r => r.id === rata.id ? { ...r, ...nuova } : r)
    }))
  }

  async function aggiorna(id, campo, valore) {
    await supabase.from('rottamazioni').update({ [campo]: valore }).eq('id', id)
    setRighe(rs => rs.map(r => r.id === id ? { ...r, [campo]: valore } : r))
  }

  async function salva() {
    setErrore(''); setSaving(true)
    const clienteSel = clienti.find(c => c.id === (form.cliente_id || clienteId))
    const { data: rot, error } = await supabase.from('rottamazioni').insert([{
      titolo: nomeC(clienteSel),
      cliente_id: form.cliente_id || clienteId || null,
      importo_totale: parseFloat(form.importo_totale) || 0,
      data_presentazione: form.data_prima_rata || null,
      stato: 'bozza', note: form.note, rate: [],
      prospetto: '—', cartella: '—', rottamazione_stato: '—', rate_stato: '—',
    }]).select().single()

    if (error) { setErrore('Errore: ' + error.message); setSaving(false); return }

    // Genera rate in tabella dedicata
    const nr = parseInt(form.numero_rate) || 18
    if (form.data_prima_rata && rot) {
      const rateArr = generaRate({ ...form, cliente_id: form.cliente_id || clienteId })
      if (rateArr.length > 0) {
        await supabase.from('rate_rottamazione').insert(
          rateArr.map(r => ({ ...r, rottamazione_id: rot.id }))
        )
      }
      if (nr >= 10) {
        const dataDecima = format(addMonths(parseISO(form.data_prima_rata), 18), 'yyyy-MM-dd')
        await supabase.from('scadenze').insert([{
          titolo: `⚠️ 10ª Rata Quinquies — ${nomeC(clienteSel)}`,
          data_scadenza: dataDecima, tipo: 'rata',
          importo: Math.round((parseFloat(form.importo_totale) || 0) / nr * 100) / 100,
          descrizione: `10ª rata rottamazione di ${nomeC(clienteSel)}.`,
          completata: false, cliente_id: form.cliente_id || clienteId || null,
        }])
      }
    }
    setModal(false); setForm(VUOTO); load(); setSaving(false)
  }

  function chiediElimina(id, nome) {
    setConfirm({ msg: `Eliminare la rottamazione${nome ? ' "'+nome+'"' : ''}?`, onOk: async () => {
      await supabase.from('rate_rottamazione').delete().eq('rottamazione_id', id)
      await supabase.from('rottamazioni').delete().eq('id', id)
      load()
    }})
  }

  const inLavorazione = righe.filter(r => !r.rottamazione_stato?.includes('Accettata'))
  const inQuinquies   = righe.filter(r =>  r.rottamazione_stato?.includes('Accettata'))
  const displayRighe  = tab === 'lavorazione' ? inLavorazione : inQuinquies
  const totale = displayRighe.reduce((s, r) => s + (parseFloat(r.importo_totale) || 0), 0)
  const isEmbed = !!clienteId

  usePagina(isEmbed ? null : 'Rottamazioni')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* Header standalone */}
      {!isEmbed && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(37,99,235,0.25)' }}>
                <Trash2 size={16} color="#fff" />
              </div>
              <div>
                <h1 className="page-title">Rottamazione Cartelle</h1>
                <p style={{ fontSize: 12.5, color: 'var(--text3)', marginTop: 1 }}>
                  {inLavorazione.length} in lavorazione · {inQuinquies.length} in Quinquies
                </p>
              </div>
            </div>
          </div>
          <button className="btn btn-gold" onClick={() => { setForm(VUOTO); setErrore(''); setModal(true) }} style={{ marginLeft: 'auto' }}>
            <Plus size={14} /> Aggiungi Cliente
          </button>
        </div>
      )}

      {/* Header embed */}
      {isEmbed && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, color: 'var(--text3)' }}>{righe.length} pratiche rottamazione</span>
          <button className="btn btn-gold" style={{ fontSize: 12, padding: '6px 12px' }}
            onClick={() => { setForm({ ...VUOTO, cliente_id: clienteId }); setErrore(''); setModal(true) }}>
            <Plus size={13} /> Aggiungi
          </button>
        </div>
      )}

      {/* KPI strip */}
      {!isEmbed && righe.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { label: 'Totale pratiche', value: righe.length,           color: 'var(--blue2)',  bg: 'var(--blue-dim)',  border: 'var(--blue-glow)' },
            { label: 'In lavorazione',  value: inLavorazione.length,   color: 'var(--amber2)', bg: 'var(--amber-dim)', border: 'rgba(245,158,11,.2)' },
            { label: 'Quinquies',       value: inQuinquies.length,     color: 'var(--green2)', bg: 'var(--green-dim)', border: 'rgba(34,197,94,.2)' },
          ].map((k, i) => (
            <div key={i} style={{ background: k.bg, border: `1.5px solid ${k.border}`, borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: k.color, letterSpacing: '-0.04em' }}>{k.value}</div>
              <div style={{ fontSize: 12, color: k.color, fontWeight: 600, opacity: 0.8 }}>{k.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="tab-bar">
        {[
          { key: 'lavorazione', label: 'Documenti Rottamazione', n: inLavorazione.length },
          { key: 'quinquies',   label: 'Rottamazione Quinquies',  n: inQuinquies.length },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`tab-item${tab === t.key ? ' tab-active' : ''}`}>
            {t.label}
            <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: tab === t.key ? 'var(--blue-dim)' : 'var(--bg4)', color: tab === t.key ? 'var(--blue2)' : 'var(--text4)', border: `1px solid ${tab === t.key ? 'var(--blue-glow)' : 'var(--border)'}` }}>{t.n}</span>
          </button>
        ))}
      </div>

      {/* Info banner */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', borderRadius: 10, background: tab === 'lavorazione' ? 'var(--blue-dim)' : 'var(--green-dim)', border: `1px solid ${tab === 'lavorazione' ? 'var(--blue-glow)' : 'rgba(34,197,94,.2)'}` }}>
        <Info size={14} color={tab === 'lavorazione' ? 'var(--blue2)' : 'var(--green2)'} style={{ flexShrink: 0, marginTop: 1 }} />
        <span style={{ fontSize: 12.5, color: tab === 'lavorazione' ? 'var(--blue2)' : 'var(--green2)', lineHeight: 1.5 }}>
          {tab === 'lavorazione'
            ? <span>Quando tutti i check sono completati il cliente passa in <strong>Rottamazione Quinquies</strong> (imposta Rottamazione = Accettata ✓).</span>
            : 'Clienti con documentazione completa. Espandi ogni riga per gestire le rate bimestrali.'}
        </span>
      </div>

      {/* ── TAB LAVORAZIONE ── */}
      {tab === 'lavorazione' && (
        <div className="card" style={{ padding: 0, overflow: 'visible' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1.5px solid var(--border)' }}>
                {!isEmbed && <th className="th">Cliente</th>}
                <th className="th">Prospetto Informativo</th>
                <th className="th">Cartella Esattoriale</th>
                <th className="th">Rottamazione</th>
                <th className="th" style={{ textAlign: 'right' }}>Importo</th>
                <th className="th" style={{ width: 50 }}></th>
              </tr>
            </thead>
            <tbody>
              {inLavorazione.map(r => {
                const prog = progressoRiga(r)
                return (
                  <tr key={r.id} className="tr">
                    {!isEmbed && (
                      <td className="td">
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text1)' }}>{r.clienti ? nomeC(r.clienti) : r.titolo}</div>
                        {r.note && <div style={{ fontSize: 11, color: 'var(--text3)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{r.note}</div>}
                        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ flex: 1, height: 3, background: 'var(--bg4)', borderRadius: 99, overflow: 'hidden', maxWidth: 100 }}>
                            <div style={{ height: '100%', width: `${prog}%`, borderRadius: 99, background: prog === 100 ? 'var(--green2)' : 'var(--blue2)', transition: 'width .4s' }} />
                          </div>
                          <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600 }}>{prog}%</span>
                        </div>
                      </td>
                    )}
                    <td className="td" style={{ minWidth: 155 }}>
                      <DropSelect value={r.prospetto || '—'} options={OPT_PROSPETTO} onChange={v => aggiorna(r.id, 'prospetto', v)} />
                    </td>
                    <td className="td" style={{ minWidth: 155 }}>
                      <DropSelect value={r.cartella || '—'} options={OPT_CARTELLA} onChange={v => aggiorna(r.id, 'cartella', v)} />
                    </td>
                    <td className="td" style={{ minWidth: 155 }}>
                      <DropSelect value={r.rottamazione_stato || '—'} options={OPT_ROTTAMAZIONE} onChange={v => aggiorna(r.id, 'rottamazione_stato', v)} />
                    </td>
                    <td className="td" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text1)', fontSize: 13.5, fontVariantNumeric: 'tabular-nums' }}>
                      {r.importo_totale ? `€ ${parseFloat(r.importo_totale).toLocaleString('it-IT', { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td className="td">
                      <button onClick={() => chiediElimina(r.id, r.ente || r.tipo)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text4)', padding: 5, display: 'flex', borderRadius: 7, transition: 'all .12s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--red-dim)'; e.currentTarget.style.color = 'var(--red2)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text4)' }}>
                        <X size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
              {inLavorazione.length === 0 && (
                <tr><td colSpan={isEmbed ? 5 : 6} style={{ padding: '40px', textAlign: 'center' }}>
                  <div style={{ color: 'var(--text4)', fontSize: 32, marginBottom: 10 }}>📋</div>
                  <div style={{ fontSize: 14, color: 'var(--text3)', fontWeight: 600 }}>Nessun cliente in lavorazione</div>
                </td></tr>
              )}
            </tbody>
            {inLavorazione.length > 0 && (
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--border2)', background: 'var(--bg2)' }}>
                  <td className="td" colSpan={isEmbed ? 3 : 4} style={{ fontWeight: 700, color: 'var(--text2)', fontSize: 12.5 }}>
                    Totale lavorazione — {inLavorazione.length} pratiche
                  </td>
                  <td className="td" style={{ textAlign: 'right', fontWeight: 800, color: 'var(--blue2)', fontSize: 15, fontVariantNumeric: 'tabular-nums' }}>
                    € {totale.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* ── TAB QUINQUIES — card espandibili con rate ── */}
      {tab === 'quinquies' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {inQuinquies.map(r => {
            const isOpen = aperto === r.id
            const rate = rateMap[r.id] || []
            const pagate = rate.filter(x => x.pagata).length
            const perc = rate.length > 0 ? Math.round((pagate / rate.length) * 100) : 0
            return (
              <div key={r.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Header riga */}
                <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
                  onClick={() => toggleAperto(r.id)}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text1)' }}>
                        {r.clienti ? nomeC(r.clienti) : r.titolo}
                      </span>
                      <span className="badge badge-green">Quinquies</span>
                      <span style={{ fontSize: 12, color: 'var(--text4)', marginLeft: 4 }}>
                        € {parseFloat(r.importo_totale || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {rate.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="progress" style={{ flex: 1, maxWidth: 200 }}>
                          <div className="progress-inner" style={{ width: `${perc}%` }} />
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text4)', whiteSpace: 'nowrap' }}>
                          {pagate}/{rate.length} rate pagate ({perc}%)
                        </span>
                      </div>
                    )}
                    {rate.length === 0 && !isOpen && (
                      <span style={{ fontSize: 12, color: 'var(--text4)' }}>Espandi per vedere le rate</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <DropSelect value={r.rate_stato || '—'} options={OPT_RATE} onChange={v => { aggiorna(r.id, 'rate_stato', v) }} />
                    <button onClick={e => { e.stopPropagation(); chiediElimina(r.id, r.ente || r.tipo) }} className="btn btn-red" style={{ padding: '5px 8px' }}>
                      <Trash2 size={13} />
                    </button>
                    {isOpen ? <ChevronUp size={16} color="var(--text4)" /> : <ChevronDown size={16} color="var(--text4)" />}
                  </div>
                </div>

                {/* Rate espanse */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid var(--border)' }}>
                    {rate.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text4)', fontSize: 13 }}>
                        Nessuna rata registrata per questa rottamazione
                      </div>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border)' }}>
                            <th className="th">#</th>
                            <th className="th">Importo</th>
                            <th className="th">Scadenza</th>
                            <th className="th">Stato</th>
                            <th className="th">Pagato il</th>
                            <th className="th" style={{ width: 50 }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {rate.map(rata => (
                            <tr key={rata.id} className="tr"
                              style={{ background: rata.numero === 10 ? 'rgba(249,115,22,0.04)' : undefined }}>
                              <td className="td">
                                <span style={{ fontWeight: rata.numero === 10 ? 700 : 400, color: rata.numero === 10 ? 'var(--amber2)' : 'var(--text3)' }}>
                                  {rata.numero === 10 ? '⚠ 10' : rata.numero}
                                </span>
                              </td>
                              <td className="td" style={{ fontWeight: 600, color: 'var(--text2)', fontVariantNumeric: 'tabular-nums' }}>
                                € {parseFloat(rata.importo).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="td" style={{ fontSize: 12 }}>
                                {parseLocalDate(rata.data_scadenza).toLocaleDateString('it-IT')}
                              </td>
                              <td className="td">
                                <span className={`badge ${rata.pagata ? 'badge-green' : 'badge-gray'}`}>
                                  {rata.pagata ? 'Pagata' : 'Da pagare'}
                                </span>
                              </td>
                              <td className="td" style={{ fontSize: 12 }}>
                                {rata.data_pagamento ? parseLocalDate(rata.data_pagamento).toLocaleDateString('it-IT') : '—'}
                              </td>
                              <td className="td">
                                <button onClick={() => togglePagata(rata, r.id)}
                                  className={`btn ${rata.pagata ? 'btn-ghost' : 'btn-green'}`}
                                  style={{ padding: '4px 8px', fontSize: 11 }}>
                                  {rata.pagata ? <X size={12} /> : <Check size={12} />}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ borderTop: '2px solid var(--border2)', background: 'var(--bg2)' }}>
                            <td className="td" colSpan={4} style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)' }}>
                              {pagate} rate pagate su {rate.length}
                            </td>
                            <td className="td" colSpan={2} style={{ textAlign: 'right', fontWeight: 700, color: perc === 100 ? 'var(--green2)' : 'var(--amber2)', fontSize: 13 }}>
                              {perc}% completato
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          {inQuinquies.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text4)' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>✅</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text3)' }}>Nessun cliente in Quinquies</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>I clienti con Rottamazione Accettata ✓ appariranno qui</div>
            </div>
          )}
        </div>
      )}

      {/* Modal aggiungi */}
      <Modal open={modal} onClose={() => setModal(false)} title="Aggiungi rottamazione" subtitle="Compila i dati del cliente"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setModal(false)}>Annulla</button>
          <button className="btn btn-gold" onClick={() => {
            if (!isEmbed && !form.cliente_id) { setErrore('Seleziona un cliente.'); return }
            if (!form.importo_totale) { setErrore("Inserisci l'importo totale."); return }
            salva()
          }} disabled={saving}>{saving ? 'Salvo...' : <><Plus size={14} /> Aggiungi</>}</button>
        </>}
      >
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                {errore && (
                  <div style={{ padding:'10px 14px', background:'var(--red-dim)', border:'1px solid rgba(239,68,68,.2)', borderRadius:9, fontSize:13, color:'var(--red2)', display:'flex', alignItems:'center', gap:8 }}>
                    <AlertCircle size={14} /> {errore}
                  </div>
                )}
                {!isEmbed && (
                  <div>
                    <label className="lbl">Cliente *</label>
                    <select className="inp" value={form.cliente_id} onChange={e => setForm(f => ({ ...f, cliente_id: e.target.value }))}>
                      <option value="">— Seleziona cliente —</option>
                      {clienti.map(c => <option key={c.id} value={c.id}>{nomeC(c)}{c.codice_fiscale ? ` — ${c.codice_fiscale}` : ''}</option>)}
                    </select>
                  </div>
                )}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div>
                    <label className="lbl">Importo totale (€) *</label>
                    <input className="inp" type="number" step="0.01" min="0" value={form.importo_totale}
                      onChange={e => setForm(f => ({ ...f, importo_totale: e.target.value }))} placeholder="es. 5000.00" />
                  </div>
                  <div>
                    <label className="lbl">N. rate bimestrali</label>
                    <input className="inp" type="number" min="1" max="36" value={form.numero_rate}
                      onChange={e => setForm(f => ({ ...f, numero_rate: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="lbl">Data prima rata</label>
                  <input className="inp" type="date" value={form.data_prima_rata}
                    onChange={e => setForm(f => ({ ...f, data_prima_rata: e.target.value }))} />
                </div>
                {form.importo_totale && form.numero_rate && (
                  <div style={{ padding:'10px 14px', background:'var(--blue-dim)', border:'1px solid var(--blue-glow)', borderRadius:9, fontSize:12.5, color:'var(--blue2)' }}>
                    📊 Rata stimata: <strong>€ {(parseFloat(form.importo_totale || 0) / parseInt(form.numero_rate || 1)).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</strong> ogni 2 mesi
                  </div>
                )}
                <div>
                  <label className="lbl">Note</label>
                  <textarea className="inp" rows={2} value={form.note}
                    onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                    style={{ resize:'none' }} placeholder="Annotazioni opzionali..." />
                </div>
        </div>
      </Modal>
      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
    </div>
  )
}
