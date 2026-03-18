import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { usePagina } from '../hooks/usePagina'
import {User, Shield, Info, Database, Zap, Palette, Save, CheckCircle2, Building2} from 'lucide-react'
import Modal from '../components/Modal'

// ── Colori tema disponibili ──────────────────────────────────────────────────
const TEMI = [
  { nome:'Blu (default)', accent:'#3b82f6', bg:'#0a0f1e' },
  { nome:'Viola',         accent:'#a855f7', bg:'#0d0a1e' },
  { nome:'Verde',         accent:'#22c55e', bg:'#0a1a0f' },
  { nome:'Ambra',         accent:'#f59e0b', bg:'#1a130a' },
  { nome:'Rosa',          accent:'#ec4899', bg:'#1a0a12' },
  { nome:'Ciano',         accent:'#06b6d4', bg:'#0a1618' },
]

function Sezione({ icon: Icon, iconColor = 'var(--blue2)', iconBg = 'var(--blue-dim)', iconBorder = 'var(--blue-glow)', title, children }) {
  return (
    <div className="card" style={{ padding:0, overflow:'hidden' }}>
      <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border2)', display:'flex', alignItems:'center', gap:9 }}>
        <div style={{ width:30, height:30, borderRadius:8, background:iconBg, border:`1px solid ${iconBorder}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon size={14} color={iconColor} />
        </div>
        <span style={{ fontSize:13.5, fontWeight:600, color:'var(--text1)', letterSpacing:'-.02em' }}>{title}</span>
      </div>
      <div style={{ padding:'16px 18px' }}>{children}</div>
    </div>
  )
}

export default function Impostazioni() {
  usePagina('Impostazioni')
  const { profile, user } = useAuth()
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState('')
  const [showKey, setShowKey]     = useState({})

  // Profilo
  const [nome, setNome]           = useState('')
  const [cognome, setCognome]     = useState('')

  // Studio
  const [studioNome, setStudioNome]   = useState('')
  const [studioLogo, setStudioLogo]   = useState('')   // emoji o URL
  const [studioColore, setStudioColore] = useState('#3b82f6')
  const [temaSelezionato, setTema]    = useState(0)

  // API keys
  const [anthropicKey, setAnthropicKey] = useState('')

  function applicaColore(col) {
    // Parse hex to rgb components for dim/glow variants
    const r = parseInt(col.slice(1,3),16)
    const g = parseInt(col.slice(3,5),16)
    const b = parseInt(col.slice(5,7),16)
    const root = document.documentElement
    root.style.setProperty('--blue', col)
    root.style.setProperty('--blue2', col)
    root.style.setProperty('--blue-dim', `rgba(${r},${g},${b},0.12)`)
    root.style.setProperty('--blue-glow', `rgba(${r},${g},${b},0.35)`)
  }

  useEffect(() => {
    if (profile) {
      setNome(profile.nome || '')
      setCognome(profile.cognome || '')
    }
    // Load from localStorage
    setStudioNome(localStorage.getItem('studio_nome') || 'Studio Mazzella')
    setStudioLogo(localStorage.getItem('studio_logo') || 'M')
    setStudioColore(localStorage.getItem('studio_colore') || '#3b82f6')
    const temaIdx = parseInt(localStorage.getItem('studio_tema') || '0')
    setTema(temaIdx)
    setAnthropicKey(localStorage.getItem('anthropic_key_hint') || '')
    // Apply saved color on load
    const savedColore = localStorage.getItem('studio_colore') || '#3b82f6'
    if (savedColore !== '#3b82f6') applicaColore(savedColore)
  }, [profile])

  async function salvaProfilo() {
    setSaving(true)
    await supabase.from('profili').update({ nome, cognome }).eq('id', user.id)
    setSaving(false)
    flash('profilo')
  }

  function salvaStudio() {
    localStorage.setItem('studio_nome', studioNome)
    localStorage.setItem('studio_logo', studioLogo)
    localStorage.setItem('studio_colore', studioColore)
    localStorage.setItem('studio_tema', temaSelezionato)
    applicaColore(studioColore)
    flash('studio')
  }



  function applicaTema(idx) {
    const t = TEMI[idx]
    setTema(idx)
    setStudioColore(t.accent)
  }

  function flash(k) {
    setSaved(k)
    setTimeout(() => setSaved(''), 2200)
  }

  function istruzioniAI() {
    return window.open('https://console.anthropic.com/settings/keys', '_blank')
  }

  const systemItems = [
    { label:'Database',      value:'Supabase · Connesso',                                        ok:true,  Icon:Database },
    { label:'Versione app',  value:'Studio Mazzella v13',                                        ok:null,  Icon:Zap },
  ]

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20, maxWidth:680 }}>
      <div>
        <h1 className="page-title">Impostazioni</h1>
        <p style={{ fontSize:12.5, color:'var(--text4)', marginTop:3 }}>Personalizza l'app e gestisci il tuo profilo</p>
      </div>

      {/* ── Profilo ── */}
      <Sezione icon={User} title="Profilo utente">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
          <div>
            <label className="lbl">Nome</label>
            <input className="inp" value={nome} onChange={e => setNome(e.target.value)} placeholder="Il tuo nome" />
          </div>
          <div>
            <label className="lbl">Cognome</label>
            <input className="inp" value={cognome} onChange={e => setCognome(e.target.value)} placeholder="Il tuo cognome" />
          </div>
          <div>
            <label className="lbl">Email</label>
            <input className="inp" value={user?.email || ''} disabled style={{ opacity:.6 }} />
          </div>
          <div>
            <label className="lbl">Ruolo</label>
            <input className="inp" value={profile?.ruolo || ''} disabled style={{ opacity:.6, textTransform:'capitalize' }} />
          </div>
        </div>
        <button className="btn btn-primary" onClick={salvaProfilo} disabled={saving}>
          {saved === 'profilo' ? <><CheckCircle2 size={13}/> Salvato!</> : saving ? 'Salvo...' : <><Save size={13}/> Salva profilo</>}
        </button>
      </Sezione>

      {/* ── Studio / Branding ── */}
      <Sezione icon={Building2} title="Studio & Branding"
        iconColor="#d8b4fe" iconBg="rgba(168,85,247,.1)" iconBorder="rgba(168,85,247,.2)">
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* Preview logo */}
          <div style={{ display:'flex', alignItems:'center', gap:16, padding:'14px 16px', background:'var(--bg2)', borderRadius:10, border:'1px solid var(--border)' }}>
            <div style={{ width:48, height:48, borderRadius:12, background:studioColore+'20', border:`2px solid ${studioColore}40`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:800, color:studioColore, flexShrink:0 }}>
              {studioLogo.length <= 2 ? studioLogo : '🏢'}
            </div>
            <div>
              <div style={{ fontSize:15, fontWeight:700, color:'var(--text1)', letterSpacing:'-.02em' }}>{studioNome || 'Nome studio'}</div>
              <div style={{ fontSize:12, color:'var(--text4)', marginTop:2 }}>Anteprima logo nella sidebar</div>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label className="lbl">Nome studio</label>
              <input className="inp" value={studioNome} onChange={e => setStudioNome(e.target.value)} placeholder="Studio Mazzella" />
            </div>
            <div>
              <label className="lbl">Logo (1-2 lettere o emoji)</label>
              <input className="inp" value={studioLogo} onChange={e => setStudioLogo(e.target.value)} placeholder="M" maxLength={2} />
            </div>
          </div>

          {/* Tema colore */}
          <div>
            <label className="lbl" style={{ marginBottom:8, display:'block' }}>Tema colore</label>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {TEMI.map((t, i) => (
                <button key={i} onClick={() => applicaTema(i)}
                  style={{ display:'flex', alignItems:'center', gap:7, padding:'7px 12px', borderRadius:8,
                    border:`1px solid ${temaSelezionato===i ? t.accent : 'var(--border2)'}`,
                    background: temaSelezionato===i ? t.accent+'18' : 'var(--bg3)',
                    cursor:'pointer', fontFamily:'inherit', transition:'all .15s' }}>
                  <div style={{ width:14, height:14, borderRadius:'50%', background:t.accent, flexShrink:0 }} />
                  <span style={{ fontSize:12.5, fontWeight:500, color: temaSelezionato===i ? t.accent : 'var(--text3)' }}>{t.nome}</span>
                  {temaSelezionato===i && <CheckCircle2 size={12} color={t.accent} />}
                </button>
              ))}
            </div>
          </div>

          {/* Colore custom */}
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div>
              <label className="lbl" style={{ marginBottom:6, display:'block' }}>Colore personalizzato</label>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <input type="color" value={studioColore} onChange={e => setStudioColore(e.target.value)}
                  style={{ width:40, height:36, borderRadius:8, border:'1px solid var(--border2)', background:'none', cursor:'pointer', padding:2 }} />
                <input className="inp" value={studioColore} onChange={e => setStudioColore(e.target.value)}
                  style={{ width:110, fontFamily:'monospace', fontSize:13 }} placeholder="#3b82f6" />
              </div>
            </div>
          </div>

          <button className="btn btn-primary" onClick={salvaStudio} style={{ alignSelf:'flex-start' }}>
            {saved === 'studio' ? <><CheckCircle2 size={13}/> Applicato!</> : <><Palette size={13}/> Applica tema</>}
          </button>
          <p style={{ fontSize:11.5, color:'var(--text4)', marginTop:-6 }}>
            ⚠️ Il tema viene applicato subito ma viene reimpostato al riavvio dell'app. Per renderlo permanente, modifica le variabili CSS in <code style={{ fontSize:11 }}>index.css</code>.
          </p>
        </div>
      </Sezione>


      {/* ── Sistema ── */}
      <Sezione icon={Shield} title="Sistema"
        iconColor="#d8b4fe" iconBg="rgba(168,85,247,.1)" iconBorder="rgba(168,85,247,.2)">
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {systemItems.map(item => (
            <div key={item.label} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 12px', background:'var(--bg2)', borderRadius:9, border:'1px solid var(--border)' }}>
              <div style={{ width:32, height:32, borderRadius:8, background:'var(--bg3)', border:'1px solid var(--border2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <item.Icon size={14} color="var(--text4)" />
              </div>
              <span style={{ fontSize:13, color:'var(--text3)', flex:1 }}>{item.label}</span>
              <span style={{ fontSize:12.5, fontWeight:600, color: item.ok===false ? '#f87171' : item.ok===true ? '#4ade80' : 'var(--amber2)' }}>{item.value}</span>
            </div>
          ))}
        </div>
      </Sezione>

      {/* ── Info ── */}
      <div className="card" style={{ background:'rgba(59,130,246,0.04)', border:'1px solid rgba(59,130,246,0.15)', padding:'16px 18px' }}>
        <div style={{ display:'flex', gap:11 }}>
          <Info size={15} color="var(--blue2)" style={{ flexShrink:0, marginTop:1 }} />
          <div style={{ fontSize:13, color:'var(--text3)', lineHeight:1.7 }}>
            <strong style={{ color:'var(--blue2)' }}>Studio Mazzella Gestionale v13</strong><br/>
            Dati salvati su <strong style={{ color:'var(--text2)' }}>Supabase</strong> (cloud sicuro).<br/>
            Preferenze UI e tema salvati in <strong style={{ color:'var(--text2)' }}>localStorage</strong> del browser.
          </div>
        </div>
      </div>
    </div>
  )
}
