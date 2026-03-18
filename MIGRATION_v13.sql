-- ============================================================
-- MIGRATION v13 — Studio Mazzella
-- Aggiunge colonna indirizzo a clienti (se non esiste)
-- ============================================================

ALTER TABLE clienti ADD COLUMN IF NOT EXISTS indirizzo TEXT;

-- Aggiunge colonna tipo a scadenze (per Notifiche.jsx)
ALTER TABLE scadenze ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'scadenza';

-- Indici utili per le query
CREATE INDEX IF NOT EXISTS idx_scadenze_data ON scadenze(data_scadenza);
CREATE INDEX IF NOT EXISTS idx_scadenze_completata ON scadenze(completata);
CREATE INDEX IF NOT EXISTS idx_pratiche_stato ON pratiche(stato);
CREATE INDEX IF NOT EXISTS idx_pratiche_cliente ON pratiche(cliente_id);
