-- ═══════════════════════════════════════════════════════
-- Aggiunta colonne mancanti a tabella rottamazioni
-- Esegui nell'SQL Editor di Supabase
-- ═══════════════════════════════════════════════════════

ALTER TABLE rottamazioni
  ADD COLUMN IF NOT EXISTS prospetto          TEXT DEFAULT '—',
  ADD COLUMN IF NOT EXISTS cartella           TEXT DEFAULT '—',
  ADD COLUMN IF NOT EXISTS rottamazione_stato TEXT DEFAULT '—',
  ADD COLUMN IF NOT EXISTS rate_stato         TEXT DEFAULT '—',
  ADD COLUMN IF NOT EXISTS rate               JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS data_presentazione DATE,
  ADD COLUMN IF NOT EXISTS note               TEXT;

-- Verifica
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'rottamazioni'
ORDER BY ordinal_position;
