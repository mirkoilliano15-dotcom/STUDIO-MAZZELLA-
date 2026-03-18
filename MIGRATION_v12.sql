-- ══════════════════════════════════════════════════════════════
-- MIGRATION v12 — Esegui nel SQL Editor di Supabase
-- ══════════════════════════════════════════════════════════════

-- 1. Tabella rate della rottamazione (separata da JSONB)
CREATE TABLE IF NOT EXISTS rate_rottamazione (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rottamazione_id  UUID REFERENCES rottamazioni(id) ON DELETE CASCADE,
  numero           INTEGER,
  importo          NUMERIC(12,2),
  data_scadenza    DATE,
  pagata           BOOLEAN DEFAULT false,
  data_pagamento   DATE,
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_rottamazione_id ON rate_rottamazione(rottamazione_id);

-- 2. Colonna forma societaria sui clienti
ALTER TABLE clienti
  ADD COLUMN IF NOT EXISTS forma_societaria TEXT;

-- Verifica
SELECT 'rate_rottamazione' AS tabella, count(*) FROM rate_rottamazione
UNION ALL
SELECT 'clienti con forma_societaria', count(*) FROM clienti WHERE forma_societaria IS NOT NULL;
