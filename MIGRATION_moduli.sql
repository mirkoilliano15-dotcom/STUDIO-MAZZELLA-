-- ══════════════════════════════════════════════════════════════
-- MIGRATION: Moduli template
-- Esegui nel SQL Editor di Supabase
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS moduli_template (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome         TEXT NOT NULL,
  categoria    TEXT,
  descrizione  TEXT,
  testo        TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_moduli_categoria ON moduli_template(categoria);

-- Verifica
SELECT count(*) AS moduli_template_count FROM moduli_template;
