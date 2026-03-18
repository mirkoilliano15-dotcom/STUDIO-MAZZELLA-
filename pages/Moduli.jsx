import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { usePagina } from '../hooks/usePagina'
import ConfirmDialog from '../components/ConfirmDialog'
import { useToast } from '../components/Toast'
import {FileText, Plus, X, Search, Edit2, Trash2, Download, Save, Copy, User} from 'lucide-react'
import Modal from '../components/Modal'

// ── Dati studio (fissi) ─────────────────────────────────────────────────────
const STUDIO = {
  nome:        'Dott. Giuseppe Mazzella',
  cf:          'MZZGPP59B16F488N',
  titolo:      'Dottore Commercialista e Revisore Legale',
  ordine:      'Ordine dei Dottori Commercialisti e degli Esperti Contabili di Napoli',
  n_ordine:    '______ / A',   // ← inserisci il tuo numero di iscrizione
  indirizzo:   'Corso Umberto I, 64 – 80070 Monte di Procida (NA)',
  telefono:    '081 8681878',
  email:       'studio@mazzella.it',
}

const CATEGORIE_PREDEFINITE = [
  'Deleghe',
  'Contratti',
  'Privacy',
  'Dichiarazioni',
  'Comunicazioni',
  'Lettere incarico',
  'Istanze',
  'Verbali',
  'Preventivi',
  'Procure',
  'Autocertificazioni',
  'Altro',
]
const VARIABILI = [
  { k: '{{cliente_nome}}',        l: 'Nome completo cliente' },
  { k: '{{cliente_cf}}',          l: 'Codice fiscale cliente' },
  { k: '{{cliente_piva}}',        l: 'Partita IVA cliente' },
  { k: '{{cliente_indirizzo}}',   l: 'Indirizzo cliente' },
  { k: '{{cliente_email}}',       l: 'Email cliente' },
  { k: '{{cliente_telefono}}',    l: 'Telefono cliente' },
  { k: '{{data_oggi}}',           l: 'Data odierna' },
  { k: '{{studio_nome}}',         l: 'Nome dottore' },
  { k: '{{studio_cf}}',           l: 'CF dottore' },
  { k: '{{studio_titolo}}',       l: 'Titolo professionale' },
  { k: '{{studio_ordine}}',       l: 'Ordine di appartenenza' },
  { k: '{{studio_n_ordine}}',     l: 'Numero iscrizione ordine' },
  { k: '{{studio_indirizzo}}',    l: 'Indirizzo studio' },
  { k: '{{studio_telefono}}',     l: 'Telefono studio' },
]

// ── Template predefiniti ─────────────────────────────────────────────────────
const TEMPLATE_DEFAULT = [
  {
    id: 'delega-agenzia',
    nome: 'Delega Agenzia delle Entrate',
    categoria: 'Deleghe',
    descrizione: 'Delega per operazioni presso l\'Agenzia delle Entrate',
    testo: `DELEGA

Il/La sottoscritto/a {{cliente_nome}}, nato/a il ____________, residente in ____________,
codice fiscale {{cliente_cf}},

DELEGA

il Dott. Giuseppe Mazzella, Dottore Commercialista e Revisore Legale,
iscritto all'O.D.C.E.C. di Napoli n. {{studio_n_ordine}},
codice fiscale {{studio_cf}},
con studio in {{studio_indirizzo}},

a rappresentarlo/a presso l'Agenzia delle Entrate per ogni operazione fiscale,
incluse la presentazione e ritiro di documenti, istanze e dichiarazioni.

Monte di Procida, {{data_oggi}}

Il/La delegante                              Il delegato
_______________________                      Dott. Giuseppe Mazzella`,
  },
  {
    id: 'delega-inps',
    nome: 'Delega INPS',
    categoria: 'Deleghe',
    descrizione: 'Delega per operazioni presso l\'INPS',
    testo: `DELEGA INPS

Il/La sottoscritto/a {{cliente_nome}},
codice fiscale {{cliente_cf}},

DELEGA

il Dott. Giuseppe Mazzella, C.F. {{studio_cf}},
Dottore Commercialista iscritto all'O.D.C.E.C. di Napoli,
studio in {{studio_indirizzo}},

ad operare in suo nome e per suo conto presso l'INPS e relativi sportelli telematici
per la gestione di posizioni previdenziali, richiesta di estratti contributivi,
domande di prestazioni e ogni altra pratica previdenziale.

Monte di Procida, {{data_oggi}}

Firma del delegante
_______________________
{{cliente_nome}}`,
  },
  {
    id: 'delega-equitalia',
    nome: 'Delega Agenzia delle Entrate Riscossione',
    categoria: 'Deleghe',
    descrizione: 'Delega per operazioni presso AdER (ex Equitalia)',
    testo: `DELEGA AGENZIA DELLE ENTRATE – RISCOSSIONE

Il/La sottoscritto/a {{cliente_nome}},
C.F. {{cliente_cf}},
residente/con sede in ____________,

conferisce delega al

Dott. Giuseppe Mazzella
Dottore Commercialista e Revisore Legale
C.F. {{studio_cf}}
Iscritto all'O.D.C.E.C. di Napoli n. {{studio_n_ordine}}
Studio: {{studio_indirizzo}} – Tel. {{studio_telefono}}

per rappresentarlo/a presso l'Agenzia delle Entrate – Riscossione in ogni operazione
riguardante cartelle esattoriali, piani di rateizzazione, rottamazioni e sgravi.

Data: {{data_oggi}}

Il delegante                                 Il professionista delegato
_______________________                      Dott. Giuseppe Mazzella`,
  },
  {
    id: 'incarico-professionale',
    nome: 'Incarico Professionale',
    categoria: 'Contratti',
    descrizione: 'Lettera di incarico professionale al commercialista',
    testo: `CONFERIMENTO INCARICO PROFESSIONALE

Il/La sottoscritto/a {{cliente_nome}},
C.F. {{cliente_cf}},
con i recapiti: {{cliente_telefono}} – {{cliente_email}},

CONFERISCE INCARICO PROFESSIONALE

al Dott. Giuseppe Mazzella
Dottore Commercialista e Revisore Legale
iscritto all'O.D.C.E.C. di Napoli n. {{studio_n_ordine}}, C.F. {{studio_cf}},
con studio in {{studio_indirizzo}},

per la consulenza e assistenza fiscale, tributaria e contabile, con decorrenza immediata.

L'incarico comprende:
- Predisposizione e invio delle dichiarazioni fiscali
- Consulenza in materia tributaria e previdenziale
- Assistenza in caso di controlli fiscali
- Ogni altra attività concordata tra le parti

Monte di Procida, {{data_oggi}}

Il Cliente                                   Il Professionista
_______________________                      Dott. Giuseppe Mazzella
{{cliente_nome}}`,
  },
  {
    id: 'informativa-privacy',
    nome: 'Informativa Privacy (GDPR)',
    categoria: 'Privacy',
    descrizione: 'Informativa e consenso trattamento dati personali',
    testo: `INFORMATIVA E CONSENSO AL TRATTAMENTO DEI DATI PERSONALI
(ai sensi del Reg. UE 2016/679 – GDPR)

Titolare del trattamento: Dott. Giuseppe Mazzella – {{studio_indirizzo}}
C.F. {{studio_cf}} – Tel. {{studio_telefono}} – Email: {{studio_email}}

Gentile {{cliente_nome}},
i Suoi dati personali (C.F. {{cliente_cf}}) vengono trattati esclusivamente per finalità
connesse all'esecuzione dell'incarico professionale conferito, nel rispetto del GDPR.

I dati non verranno ceduti a terzi senza esplicito consenso, salvo obblighi di legge.

□ ACCONSENTO al trattamento dei miei dati personali per le finalità indicate.

Data: {{data_oggi}}

Firma
_______________________
{{cliente_nome}}`,
  },
]

// ── Compilazione variabili ───────────────────────────────────────────────────
function compila(testo, cliente) {
  const oggi = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
  const nomeCliente = cliente
    ? (cliente.ragione_sociale || `${cliente.nome || ''} ${cliente.cognome || ''}`.trim())
    : ''
  return testo
    .replace(/{{cliente_nome}}/g,      nomeCliente)
    .replace(/{{cliente_cf}}/g,        cliente?.codice_fiscale || '_________________')
    .replace(/{{cliente_piva}}/g,      cliente?.partita_iva || '_________________')
    .replace(/{{cliente_indirizzo}}/g, cliente?.indirizzo || '_________________')
    .replace(/{{cliente_email}}/g,     cliente?.email || '_________________')
    .replace(/{{cliente_telefono}}/g,  cliente?.telefono || '_________________')
    .replace(/{{data_oggi}}/g,         oggi)
    .replace(/{{studio_nome}}/g,       STUDIO.nome)
    .replace(/{{studio_cf}}/g,         STUDIO.cf)
    .replace(/{{studio_titolo}}/g,     STUDIO.titolo)
    .replace(/{{studio_ordine}}/g,     STUDIO.ordine)
    .replace(/{{studio_n_ordine}}/g,   STUDIO.n_ordine)
    .replace(/{{studio_indirizzo}}/g,  STUDIO.indirizzo)
    .replace(/{{studio_telefono}}/g,   STUDIO.telefono)
    .replace(/{{studio_email}}/g,      STUDIO.email)
}

// ── Componente principale ────────────────────────────────────────────────────
export default function Moduli() {
  const toast = useToast()
  usePagina('Moduli')
  const [tab, setTab]               = useState('usa')   // usa | gestisci
  const [templates, setTemplates]   = useState([])
  const [clienti, setClienti]       = useState([])
  const [q, setQ]                   = useState('')
  const [categoriaFiltro, setCat]   = useState('')
  const [confirm, setConfirm]       = useState(null)

  // Seleziona e usa modulo
  const [selTemplate, setSelTemplate] = useState(null)
  const [selCliente, setSelCliente]   = useState(null)
  const [testoCompilato, setTesto]    = useState('')
  const [modalUsa, setModalUsa]       = useState(false)

  // Crea / modifica template
  const [modalTemplate, setModalTemplate] = useState(false)
  const [editTemplate, setEditTemplate]   = useState(null) // null = nuovo
  const [formT, setFormT] = useState({ nome: '', categoria: '', descrizione: '', testo: '' })
  const [saving, setSaving] = useState(false)
  const testoRef = useRef(null)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [{ data: c }, { data: t }] = await Promise.all([
      supabase.from('clienti').select('id,ragione_sociale,nome,cognome,codice_fiscale,partita_iva,telefono,email,indirizzo'),
      supabase.from('moduli_template').select('*').order('categoria'),
    ])
    setClienti(c || [])
    // Merge template DB + default (i default si vedono solo se non c'è un template DB con stesso id)
    const dbIds = new Set((t || []).map(x => x.id))
    const merged = [
      ...TEMPLATE_DEFAULT.filter(td => !dbIds.has(td.id)),
      ...(t || []),
    ]
    setTemplates(merged)
  }

  const nomeCliente = c => c ? (c.ragione_sociale || `${c.nome || ''} ${c.cognome || ''}`.trim()) : '—'

  // Apri modale usa
  function apriUsa(tmpl) {
    setSelTemplate(tmpl)
    setSelCliente(null)
    setTesto(tmpl.testo)
    setModalUsa(true)
  }

  // Quando cambia cliente, ricompila
  function cambiaCliente(id) {
    const c = clienti.find(x => x.id === id) || null
    setSelCliente(c)
    setTesto(compila(selTemplate.testo, c))
  }

  function stampa() {
    const w = window.open('', '_blank')
    w.document.write(`<html><head><title>${selTemplate.nome}</title>
      <style>body{font-family:Arial,sans-serif;font-size:14px;line-height:1.8;padding:40px;max-width:800px;margin:0 auto;white-space:pre-wrap;}
      @media print{body{padding:20px}}</style></head>
      <body>${testoCompilato.replace(/\n/g,'<br>')}</body></html>`)
    w.document.close()
    w.print()
  }

  function copia() {
    navigator.clipboard.writeText(testoCompilato)
    toast('Testo copiato negli appunti', 'success')
  }

  // Crea/modifica template
  function apriNuovoTemplate() {
    setEditTemplate(null)
    setFormT({ nome: '', categoria: CATEGORIE_PREDEFINITE[0], descrizione: '', testo: '' })
    setModalTemplate(true)
  }

  function apriModificaTemplate(t) {
    setEditTemplate(t)
    setFormT({ nome: t.nome, categoria: t.categoria, descrizione: t.descrizione || '', testo: t.testo })
    setModalTemplate(true)
  }

  async function salvaTemplate() {
    if (!formT.nome.trim() || !formT.testo.trim()) return
    setSaving(true)
    if (editTemplate && editTemplate.id && !TEMPLATE_DEFAULT.find(d => d.id === editTemplate.id)) {
      // Update esistente su DB
      await supabase.from('moduli_template').update(formT).eq('id', editTemplate.id)
      toast('Modulo aggiornato', 'success')
    } else {
      // Insert nuovo
      await supabase.from('moduli_template').insert([formT])
      toast('Modulo creato', 'success')
    }
    setSaving(false)
    setModalTemplate(false)
    loadAll()
  }

  async function eliminaTemplate(t) {
    if (TEMPLATE_DEFAULT.find(d => d.id === t.id)) {
      toast('I moduli predefiniti non possono essere eliminati', 'error')
      return
    }
    setConfirm({ msg: `Eliminare il modulo "${t.nome}"?`, onOk: async () => {
      await supabase.from('moduli_template').delete().eq('id', t.id)
      toast('Modulo eliminato', 'success')
      loadAll()
    }})
  }

  function inserisciVariabile(v) {
    const el = testoRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const nuovoTesto = formT.testo.slice(0, start) + v + formT.testo.slice(end)
    setFormT(f => ({ ...f, testo: nuovoTesto }))
    setTimeout(() => { el.focus(); el.setSelectionRange(start + v.length, start + v.length) }, 0)
  }

  const categorie = [...new Set(templates.map(t => t.categoria).filter(Boolean))]
  const filtered = templates.filter(t => {
    const matchQ = !q || t.nome.toLowerCase().includes(q.toLowerCase()) || (t.descrizione || '').toLowerCase().includes(q.toLowerCase())
    const matchCat = !categoriaFiltro || t.categoria === categoriaFiltro
    return matchQ && matchCat
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Moduli</h1>
          <p style={{ fontSize: 12.5, color: 'var(--text4)', marginTop: 3 }}>
            Moduli precompilati con i dati del cliente
          </p>
        </div>
        <button className="btn btn-primary" onClick={apriNuovoTemplate}>
          <Plus size={13} /> Nuovo modulo
        </button>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        <button className={`tab-item${tab === 'usa' ? ' tab-active' : ''}`} onClick={() => setTab('usa')}>
          Usa moduli
        </button>
        <button className={`tab-item${tab === 'gestisci' ? ' tab-active' : ''}`} onClick={() => setTab('gestisci')}>
          Gestisci moduli
          <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: 'var(--bg4)', color: 'var(--text4)', border: '1px solid var(--border)' }}>{templates.length}</span>
        </button>
      </div>

      {/* Ricerca + filtro categoria */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
          <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text4)', pointerEvents: 'none' }} />
          <input className="inp" style={{ paddingLeft: 34 }} value={q} onChange={e => setQ(e.target.value)} placeholder="Cerca modulo..." />
          {q && <button onClick={() => setQ('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text4)', display: 'flex' }}><X size={13} /></button>}
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          <button onClick={() => setCat('')} style={{ padding: '5px 11px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', border: `1px solid ${!categoriaFiltro ? 'var(--blue)' : 'var(--border2)'}`, background: !categoriaFiltro ? 'var(--blue-dim)' : 'var(--bg3)', color: !categoriaFiltro ? 'var(--blue2)' : 'var(--text3)' }}>
            Tutti
          </button>
          {categorie.map(cat => (
            <button key={cat} onClick={() => setCat(cat === categoriaFiltro ? '' : cat)} style={{ padding: '5px 11px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', border: `1px solid ${categoriaFiltro === cat ? 'var(--blue)' : 'var(--border2)'}`, background: categoriaFiltro === cat ? 'var(--blue-dim)' : 'var(--bg3)', color: categoriaFiltro === cat ? 'var(--blue2)' : 'var(--text3)' }}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Griglia moduli */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {filtered.map(t => {
          const isPredefinito = !!TEMPLATE_DEFAULT.find(d => d.id === t.id)
          return (
            <div key={t.id || t.nome} className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12, transition: 'border-color .15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border3)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--blue-dim)', border: '1px solid var(--blue-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <FileText size={13} color="var(--blue2)" />
                    </div>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text1)', letterSpacing: '-.02em', lineHeight: 1.3 }}>{t.nome}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <span className="badge badge-blue">{t.categoria}</span>
                    {isPredefinito && <span className="badge badge-gray">Predefinito</span>}
                  </div>
                </div>
              </div>
              {t.descrizione && (
                <p style={{ fontSize: 12, color: 'var(--text4)', lineHeight: 1.5, margin: 0 }}>{t.descrizione}</p>
              )}
              <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
                <button className="btn btn-primary" style={{ flex: 1, fontSize: 12 }} onClick={() => apriUsa(t)}>
                  <User size={12} /> Compila
                </button>
                <button className="btn btn-ghost" style={{ padding: '6px 10px' }} onClick={() => apriModificaTemplate(t)} title="Modifica template">
                  <Edit2 size={13} />
                </button>
                {!isPredefinito && (
                  <button className="btn btn-ghost" style={{ padding: '6px 10px' }} onClick={() => eliminaTemplate(t)} title="Elimina">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          )
        })}

        {/* Card aggiungi nuovo */}
        <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', border: '1.5px dashed var(--border2)', background: 'transparent', minHeight: 160 }}
          onClick={apriNuovoTemplate}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--blue)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border2)'}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--bg3)', border: '1px solid var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Plus size={16} color="var(--text4)" />
          </div>
          <span style={{ fontSize: 13, color: 'var(--text4)', fontWeight: 600 }}>Nuovo modulo</span>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div className="empty-state-icon"><FileText size={32} /></div>
          <div className="empty-state-title">Nessun modulo trovato</div>
          <div className="empty-state-sub">Crea il tuo primo modulo personalizzato</div>
        </div>
      )}

      {/* ── Modal USA modulo ──────────────────────────────────────────────── */}
      {modalUsa && selTemplate && (
        <div style={{ position:"fixed", inset:0, zIndex:100, background:"rgba(5,8,20,.82)", backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)", overflow:"hidden", display:"block" }} onClick={() => setModalUsa(false)}>
          <div style={{ background:"var(--bg3)", border:"1px solid var(--border3)", borderRadius:16, width:"100%", maxWidth:540, margin:"32px auto", boxShadow:"0 40px 100px rgba(0,0,0,.7)" }} style={{ maxWidth: 780, width: '95vw' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding:"18px 22px", borderBottom:"1px solid var(--border2)", display:"flex", alignItems:"center", justifyContent:"space-between", borderRadius:"16px 16px 0 0" }}>
              <div>
                <h2 style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--text1)' }}>{selTemplate.nome}</h2>
                <p style={{ fontSize: 12, color: 'var(--text4)', marginTop: 2 }}>Seleziona il cliente per compilare automaticamente</p>
              </div>
              <button onClick={() => setModalUsa(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text4)', display: 'flex' }}><X size={15} /></button>
            </div>
            <div style={{ padding:"20px 22px", display:"flex", flexDirection:"column", gap:14 }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Seleziona cliente */}
              <div>
                <label className="lbl">Cliente</label>
                <select className="inp" value={selCliente?.id || ''} onChange={e => cambiaCliente(e.target.value)}>
                  <option value="">— Nessun cliente (lascia segnaposto) —</option>
                  {clienti.map(c => (
                    <option key={c.id} value={c.id}>{nomeCliente(c)}{c.codice_fiscale ? ` – ${c.codice_fiscale}` : ''}</option>
                  ))}
                </select>
              </div>

              {/* Testo compilato — modificabile */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label className="lbl" style={{ margin: 0 }}>Testo del modulo</label>
                  <span style={{ fontSize: 11, color: 'var(--text4)' }}>Puoi modificare il testo anche dopo aver selezionato il cliente</span>
                </div>
                <textarea
                  value={testoCompilato}
                  onChange={e => setTesto(e.target.value)}
                  style={{ width: '100%', minHeight: 380, fontFamily: 'monospace', fontSize: 12.5, lineHeight: 1.75, resize: 'vertical', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 10, padding: '14px', color: 'var(--text2)', boxSizing: 'border-box' }}
                />
              </div>
            </div>
            <div style={{ padding:"14px 22px", borderTop:"1px solid var(--border2)", display:"flex", gap:8, justifyContent:"flex-end" }} style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost" onClick={copia}><Copy size={13} /> Copia testo</button>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost" onClick={() => setModalUsa(false)}>Chiudi</button>
                <button className="btn btn-primary" onClick={stampa}><Download size={13} /> Stampa / PDF</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal CREA/MODIFICA template ─────────────────────────────────── */}
      {modalTemplate && (
        <div style={{ position:"fixed", inset:0, zIndex:100, background:"rgba(5,8,20,.82)", backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)", overflow:"hidden", display:"block" }} onClick={() => setModalTemplate(false)}>
          <div style={{ background:"var(--bg3)", border:"1px solid var(--border3)", borderRadius:16, width:"100%", maxWidth:540, margin:"32px auto", boxShadow:"0 40px 100px rgba(0,0,0,.7)" }} style={{ maxWidth: 820, width: '95vw' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding:"18px 22px", borderBottom:"1px solid var(--border2)", display:"flex", alignItems:"center", justifyContent:"space-between", borderRadius:"16px 16px 0 0" }}>
              <div>
                <h2 style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--text1)' }}>
                  {editTemplate ? 'Modifica modulo' : 'Nuovo modulo'}
                </h2>
                <p style={{ fontSize: 12, color: 'var(--text4)', marginTop: 2 }}>
                  Usa {`{{variabile}}`} per inserire dati automatici
                </p>
              </div>
              <button onClick={() => setModalTemplate(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text4)', display: 'flex' }}><X size={15} /></button>
            </div>
            <div style={{ padding:"20px 22px", display:"flex", flexDirection:"column", gap:14 }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="lbl">Nome modulo *</label>
                  <input className="inp" value={formT.nome} onChange={e => setFormT(f => ({ ...f, nome: e.target.value }))} placeholder="Es. Delega Agenzia Entrate" />
                </div>
                <div>
                  <label className="lbl">Tipo documento</label>
                  <select className="inp" value={CATEGORIE_PREDEFINITE.includes(formT.categoria) ? formT.categoria : '__custom__'}
                    onChange={e => {
                      if (e.target.value !== '__custom__') setFormT(f => ({ ...f, categoria: e.target.value }))
                    }}>
                    {CATEGORIE_PREDEFINITE.map(c => <option key={c} value={c}>{c}</option>)}
                    {!CATEGORIE_PREDEFINITE.includes(formT.categoria) && formT.categoria &&
                      <option value="__custom__">{formT.categoria}</option>}
                  </select>
                  {!CATEGORIE_PREDEFINITE.includes(formT.categoria) || formT.categoria === '' ? (
                    <input className="inp" style={{ marginTop: 6 }} value={formT.categoria} onChange={e => setFormT(f => ({ ...f, categoria: e.target.value }))} placeholder="Oppure scrivi una categoria personalizzata..." />
                  ) : null}
                </div>
              </div>
              <div>
                <label className="lbl">Descrizione <span style={{ color: 'var(--text4)', fontWeight: 400 }}>(opzionale)</span></label>
                <input className="inp" value={formT.descrizione} onChange={e => setFormT(f => ({ ...f, descrizione: e.target.value }))} placeholder="Breve descrizione del modulo" />
              </div>

              {/* Variabili disponibili */}
              <div>
                <label className="lbl" style={{ marginBottom: 6, display: 'block' }}>Variabili disponibili — clicca per inserire nel testo</label>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {VARIABILI.map(v => (
                    <button key={v.k} onClick={() => inserisciVariabile(v.k)}
                      title={v.l}
                      style={{ padding: '3px 9px', borderRadius: 6, fontSize: 11, fontFamily: 'monospace', cursor: 'pointer', border: '1px solid var(--border2)', background: 'var(--bg3)', color: 'var(--text3)', transition: 'all .12s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--blue-dim)'; e.currentTarget.style.color = 'var(--blue2)'; e.currentTarget.style.borderColor = 'var(--blue-glow)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg3)'; e.currentTarget.style.color = 'var(--text3)'; e.currentTarget.style.borderColor = 'var(--border2)' }}>
                      {v.k}
                    </button>
                  ))}
                </div>
              </div>

              {/* Testo template */}
              <div>
                <label className="lbl">Testo del modulo *</label>
                <textarea
                  ref={testoRef}
                  value={formT.testo}
                  onChange={e => setFormT(f => ({ ...f, testo: e.target.value }))}
                  style={{ width: '100%', minHeight: 340, fontFamily: 'monospace', fontSize: 12.5, lineHeight: 1.75, resize: 'vertical', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 10, padding: '14px', color: 'var(--text2)', boxSizing: 'border-box' }}
                  placeholder="Scrivi il testo del modulo. Usa {{cliente_nome}}, {{cliente_cf}}, ecc. per i dati automatici..."
                />
              </div>
            </div>
            <div style={{ padding:"14px 22px", borderTop:"1px solid var(--border2)", display:"flex", gap:8, justifyContent:"flex-end" }}>
              <button className="btn btn-ghost" onClick={() => setModalTemplate(false)}>Annulla</button>
              <button className="btn btn-primary" onClick={salvaTemplate} disabled={saving || !formT.nome.trim() || !formT.testo.trim()}>
                {saving ? 'Salvo...' : <><Save size={13} /> {editTemplate ? 'Aggiorna modulo' : 'Crea modulo'}</>}
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
    </div>
  )
}
