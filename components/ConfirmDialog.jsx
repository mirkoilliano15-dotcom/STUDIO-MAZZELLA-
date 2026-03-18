import { useEffect } from 'react'
import { AlertTriangle, Trash2, X } from 'lucide-react'

/**
 * Dialog di conferma in-app, sostituisce window.confirm().
 *
 * Uso:
 *   const [confirm, setConfirm] = useState(null)
 *   // Per aprire:
 *   setConfirm({ msg: 'Eliminare questo cliente?', onOk: () => eliminaCliente(id) })
 *   // Nel JSX:
 *   <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
 */
export default function ConfirmDialog({ state, onClose }) {
  useEffect(() => {
    if (!state) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [state, onClose])

  if (!state) return null

  const { msg, onOk, danger = true, okLabel = 'Elimina', cancelLabel = 'Annulla' } = state

  return (
    <div
      onClick={onClose}
      style={{ position:"fixed", inset:0, zIndex:999, background:"rgba(0,0,0,0.75)", backdropFilter:"blur(8px)", WebkitBackdropFilter:"blur(8px)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg3)',
          border: '1px solid var(--border3)',
          borderRadius: 16,
          padding: '24px',
          width: '100%',
          maxWidth: 400,
          boxShadow: '0 32px 80px rgba(0,0,0,.7)',
          animation: 'slideUp .15s cubic-bezier(.16,1,.3,1)',
        }}
      >
        {/* Icon + message */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 22 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            background: danger ? 'var(--red-dim)' : 'var(--amber-dim)',
            border: `1px solid ${danger ? 'rgba(239,68,68,.25)' : 'rgba(245,158,11,.25)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {danger
              ? <Trash2 size={17} color="#f87171" />
              : <AlertTriangle size={17} color="var(--amber2)" />
            }
          </div>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text1)', letterSpacing: '-.02em', marginBottom: 5 }}>
              Sei sicuro?
            </div>
            <div style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.55 }}>{msg}</div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            className="btn btn-ghost"
            onClick={onClose}
            autoFocus
          >
            <X size={13} />{cancelLabel}
          </button>
          <button
            className="btn"
            onClick={() => { onOk(); onClose() }}
            style={{
              background: danger ? 'rgba(239,68,68,.15)' : 'var(--amber-dim)',
              border: `1px solid ${danger ? 'rgba(239,68,68,.3)' : 'rgba(245,158,11,.3)'}`,
              color: danger ? '#f87171' : 'var(--amber2)',
            }}
          >
            {danger ? <Trash2 size={13} /> : <AlertTriangle size={13} />}
            {okLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
