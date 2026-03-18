-- ══════════════════════════════════════════════════════════════
-- MIGRATION: Rateizzi
-- Esegui nel SQL Editor di Supabase
-- ══════════════════════════════════════════════════════════════

-- Tabella piani di rateizzazione
CREATE TABLE IF NOT EXISTS rateizzazioni (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id       UUID REFERENCES clienti(id) ON DELETE SET NULL,
  titolo           TEXT NOT NULL,
  importo_totale   NUMERIC(12,2),
  numero_rate      INTEGER,
  data_prima_rata  DATE,
  stato            TEXT DEFAULT 'attiva',
  note             TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rateizzazioni_cliente ON rateizzazioni(cliente_id);

-- Tabella singole rate
CREATE TABLE IF NOT EXISTS rate (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rateizzazione_id  UUID REFERENCES rateizzazioni(id) ON DELETE CASCADE,
  numero            INTEGER,
  importo           NUMERIC(12,2),
  data_scadenza     DATE,
  pagata            BOOLEAN DEFAULT false,
  data_pagamento    DATE,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_rateizzazione ON rate(rateizzazione_id);

-- Verifica
SELECT 'rateizzazioni' AS tabella, count(*) FROM rateizzazioni
UNION ALL
SELECT 'rate', count(*) FROM rate;
