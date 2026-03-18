import { useEffect } from 'react'

/**
 * Imposta il titolo della tab del browser e gestisce il tasto Escape.
 *
 * @param {string}   titolo     - Nome della pagina, es. "Clienti"
 * @param {boolean}  modalOpen  - true quando un modal è aperto (abilita Escape)
 * @param {Function} onEscape   - callback chiamata alla pressione di Escape
 */
export function usePagina(titolo, modalOpen = false, onEscape = null) {
  // Titolo dinamico
  useEffect(() => {
    document.title = titolo ? `${titolo} — Studio Mazzella` : 'Studio Mazzella'
    return () => { document.title = 'Studio Mazzella' }
  }, [titolo])

  // Escape per chiudere modal
  useEffect(() => {
    if (!modalOpen || !onEscape) return
    const handler = (e) => { if (e.key === 'Escape') onEscape() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [modalOpen, onEscape])
}
