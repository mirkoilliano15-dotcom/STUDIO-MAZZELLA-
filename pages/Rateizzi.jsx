import { useState, useEffect } from 'react'
import { supabase, parseLocalDate } from '../lib/supabase'
import { usePagina } from '../hooks/usePagina'
import ConfirmDialog from '../components/ConfirmDialog'
import Modal from '../components/Modal'
import { Plus, ChevronDown, ChevronUp, Check, X, Trash2 } from 'lucide-react'
import { format, addMonths, parseISO } from 'date-fns'

const VUOTO = { titolo: '', cliente_id: '', importo_totale: '', numero_rate: '12', data_prima_rata: '', stato: 'attiva', note: '' }

export default function Rateizzi() {
  const [lista, setLista] = useState([])
  const [clienti, setClienti] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(VUOTO)
  const [saving, setSaving] = useState(false)
  const [errore, setErrore] = useState('')
  const [editStato, setEditStato] = useState(null)
  const [aperto, setAperto] = useState(null)
  const [rate, setRate] = useState({})
  const [loading, setLoading] = useState(true)
  const [confirm, setConfirm] = useState(null)

  usePagina('Rateizzi')
  useEffect(() => { load() }, [])

  async function load() {
    try {
      setLoading(true)
      const [{ data: r }, { data: c }] = await Promise.all([
        supabase.from('rateizzazioni').select('*, clienti(ragione_sociale,nome,cognome)').order('created_at', { ascending: false }),
        supabase.from('clienti').select('id,ragione_sociale,nome,cognome'),
      ])
      setLista(r || [])
      setClienti(c || [])
    } catch(e) {
      console.error('Errore:', e)
    } finally {
      setLoading(false)
    }
  }

  async function apriRate(id) {
    if (aperto === id) { setAperto(null); return }
    setAperto(id)
    if (!rate[id]) {
      const { data } = await supabase.from('rate').select('*').eq('rateizzazione_id', id).order('numero')
      setRate(r => ({ ...r, [id]: data || [] }))
    }
  }

  async function togglePagata(rata) {
    const { data: updated } = await supabase.from('rate').update({
      pagata: !rata.pagata,
      data_pagamento: !rata.pagata ? new Date().toISOString().split('T')[0] : null
    }).eq('id', rata.id).select().single()
    if (updated) {
      setRate(r => ({ ...r, [rata.rateizzazione_id]: r[rata.rateizzazione_id].map(x => x.id === rata.id ? updated : x) }))
    }
  }

  async function salva() {
    setErrore('')
    if (!form.titolo) { setErrore('Inserisci il titolo.'); return }
    if (!form.importo_totale) { setErrore("Inserisci l'importo totale."); return }
    setSaving(true)
    try {
      const nr = parseInt(form.numero_rate)
      const totale = parseFloat(form.importo_totale)
      if (isNaN(nr) || nr < 1) { setErrore('Numero rate non valido.'); return }
      if (isNaN(totale) || totale <= 0) { setErrore('Importo totale non valido.'); return }
      const importoRata = Math.round((totale / nr) * 100) / 100
      const primaData = form.data_prima_rata ? parseISO(form.data_prima_rata) : new Date()

      const { data: rat, error } = await supabase.from('rateizzazioni').insert([{
        titolo: form.titolo, cliente_id: form.cliente_id || null,
        importo_totale: totale, numero_rate: nr,
        data_prima_rata: form.data_prima_rata || null,
        stato: form.stato, note: form.note || null,
      }]).select('id').single()

      if (error || !rat) { setErrore('Errore: ' + (error?.message || 'risposta vuota')); return }

      await supabase.from('rate').insert(
        Array.from({ length: nr }, (_, i) => ({
          rateizzazione_id: rat.id, numero: i + 1, importo: importoRata,
          data_scadenza: format(addMonths(primaData, i), 'yyyy-MM-dd'), pagata: false,
        }))
      )

      if (nr >= 10) {
        await supabase.from('scadenze').insert([{
          titolo: `⚠️ 10ª Rata — ${form.titolo}`,
          data_scadenza: format(addMonths(primaData, 9), 'yyyy-MM-dd'),
          tipo: 'rata', importo: importoRata, completata: false,
          cliente_id: form.cliente_id || null,
        }])
      }

      setModal(false); setForm(VUOTO); await load()
    } catch (e) {
      setErrore('Errore: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  async function cambiaStato(id, stato) {
    const { error } = await supabase.from('rateizzazioni').update({ stato }).eq('id', id)
    if (!error) setLista(ls => ls.map(l => l.id === id ? { ...l, stato } : l))
    setEditStato(null)
  }

  function chiediElimina(id, titolo) {
    setConfirm({ msg: `Eliminare "${titolo}"? Verranno eliminate anche tutte le rate.`, onOk: async () => {
      await supabase.from('rate').delete().eq('rateizzazione_id', id)
      await supabase.from('rateizzazioni').delete().eq('id', id)
      load()
    }})
  }

  const nomeCliente = c => c.clienti ? (c.clienti.ragione_sociale || `${c.clienti.nome || ''} ${c.clienti.cognome || ''}`.trim()) : '—'

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', flexDirection:'column', gap:12 }}>
      <div className="spinner" style={{ width:26, height:26 }} />
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div>
          <h1 className="page-title">Rateizzi</h1>
          <p style={{ fontSize: 13, color: 'var(--text4)', marginTop: 2 }}>{lista.length} piani di rateizzazione</p>
        </div>
        <button className="btn btn-gold" onClick={() => { setForm(VUOTO); setErrore(''); setModal(true) }} style={{ marginLeft: 'auto' }}>
          <Plus size={15} /> Nuovo rateizzazione
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {lista.map(r => {
          const rateList = rate[r.id] || []
          const pagate = rateList.filter(x => x.pagata).length
          const perc = rateList.length > 0 ? Math.round((pagate / rateList.length) * 100) : 0
          const isOpen = aperto === r.id
          return (
            <div key={r.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }} onClick={() => apriRate(r.id)}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text1)' }}>{r.titolo}</span>
                    {editStato === r.id ? (
                      <select autoFocus className="badge" style={{ cursor:'pointer', fontFamily:'inherit', border:'1px solid var(--border2)', background:'white', color:'var(--text1)', fontWeight:600, fontSize:11, padding:'2px 6px', borderRadius:6 }}
                        value={r.stato} onChange={e => cambiaStato(r.id, e.target.value)} onBlur={() => setEditStato(null)}>
                        <option value="attiva">attiva</option><option value="sospesa">sospesa</option>
                        <option value="conclusa">conclusa</option><option value="decaduta">decaduta</option>
                      </select>
                    ) : (
                      <span className={`badge ${r.stato === 'attiva' ? 'badge-green' : r.stato === 'decaduta' ? 'badge-red' : r.stato === 'conclusa' ? 'badge-blue' : 'badge-gray'}`}
                        style={{ cursor:'pointer' }} onClick={e => { e.stopPropagation(); setEditStato(r.id) }}>{r.stato}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text4)' }}>{nomeCliente(r)} · €{parseFloat(r.importo_totale || 0).toLocaleString('it-IT')} · {r.numero_rate} rate</div>
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="progress" style={{ flex: 1 }}><div className="progress-inner" style={{ width: `${perc}%` }} /></div>
                    <span style={{ fontSize: 11, color: 'var(--text4)', whiteSpace: 'nowrap' }}>{pagate}/{r.numero_rate} ({perc}%)</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button onClick={e => { e.stopPropagation(); chiediElimina(r.id, r.titolo) }} className="btn btn-red" style={{ padding: '5px 8px' }}><Trash2 size={13} /></button>
                  {isOpen ? <ChevronUp size={16} color="var(--text4)" /> : <ChevronDown size={16} color="var(--text4)" />}
                </div>
              </div>
              {isOpen && (
                <div style={{ borderTop: '1px solid var(--border)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr><th className="th">#</th><th className="th">Importo</th><th className="th">Scadenza</th><th className="th">Stato</th><th className="th">Pagato il</th><th className="th" style={{ width: 50 }}></th></tr></thead>
                    <tbody>
                      {(rate[r.id] || []).map(rata => (
                        <tr key={rata.id} className="tr">
                          <td className="td"><span style={{ fontWeight: rata.numero === 10 ? 700 : 400, color: rata.numero === 10 ? '#fb923c' : 'var(--text3)' }}>{rata.numero === 10 ? '⚠ 10' : rata.numero}</span></td>
                          <td className="td">€{parseFloat(rata.importo).toLocaleString('it-IT')}</td>
                          <td className="td" style={{ fontSize: 12 }}>{parseLocalDate(rata.data_scadenza).toLocaleDateString('it-IT')}</td>
                          <td className="td"><span className={`badge ${rata.pagata ? 'badge-green' : 'badge-gray'}`}>{rata.pagata ? 'Pagata' : 'Da pagare'}</span></td>
                          <td className="td" style={{ fontSize: 12 }}>{rata.data_pagamento ? parseLocalDate(rata.data_pagamento).toLocaleDateString('it-IT') : '—'}</td>
                          <td className="td">
                            <button onClick={() => togglePagata(rata)} className={`btn ${rata.pagata ? 'btn-ghost' : 'btn-green'}`} style={{ padding: '4px 8px', fontSize: 11 }}>
                              {rata.pagata ? <X size={12} /> : <Check size={12} />}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
        {lista.length === 0 && <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text4)' }}>Nessun piano di rateizzazione. Crea il primo!</div>}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Nuovo piano rateizzazione" subtitle="Configura importo, rate e prima scadenza"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setModal(false)}>Annulla</button>
          <button className="btn btn-gold" onClick={salva} disabled={saving}>{saving ? 'Salvo...' : <><Plus size={13} /> Salva</>}</button>
        </>}
      >
        {errore && <div style={{ padding:'10px 14px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, fontSize:13, color:'#dc2626' }}>{errore}</div>}
        <div><label className="lbl">Titolo *</label>
          <input className="inp" autoFocus value={form.titolo} onChange={e => setForm(f => ({ ...f, titolo: e.target.value }))} placeholder="Es. Rateizzazione IRPEF 2023" /></div>
        <div><label className="lbl">Cliente</label>
          <select className="inp" value={form.cliente_id} onChange={e => setForm(f => ({ ...f, cliente_id: e.target.value }))}>
            <option value="">— Seleziona cliente —</option>
            {clienti.map(c => <option key={c.id} value={c.id}>{c.ragione_sociale || `${c.nome || ''} ${c.cognome || ''}`.trim()}</option>)}
          </select></div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div><label className="lbl">Importo totale (€) *</label>
            <input className="inp" type="number" value={form.importo_totale} onChange={e => setForm(f => ({ ...f, importo_totale: e.target.value }))} /></div>
          <div><label className="lbl">Numero rate</label>
            <input className="inp" type="number" min="1" max="72" value={form.numero_rate} onChange={e => setForm(f => ({ ...f, numero_rate: e.target.value }))} /></div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div><label className="lbl">Prima rata</label>
            <input className="inp" type="date" value={form.data_prima_rata} onChange={e => setForm(f => ({ ...f, data_prima_rata: e.target.value }))} /></div>
          <div><label className="lbl">Stato</label>
            <select className="inp" value={form.stato} onChange={e => setForm(f => ({ ...f, stato: e.target.value }))}>
              <option value="attiva">Attiva</option><option value="sospesa">Sospesa</option>
              <option value="conclusa">Conclusa</option><option value="decaduta">Decaduta</option>
            </select></div>
        </div>
        {parseInt(form.numero_rate) >= 10 && (
          <div style={{ background:'#fff7ed', border:'1px solid #fed7aa', borderRadius:8, padding:'10px 12px', fontSize:12, color:'#c2410c' }}>
            ⚠️ Con {form.numero_rate} rate verrà creata una scadenza di avviso per la 10ª rata.
          </div>
        )}
        <div><label className="lbl">Note</label>
          <textarea className="inp" rows={2} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} style={{ resize:'none' }} /></div>
      </Modal>

      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
    </div>
  )
}
