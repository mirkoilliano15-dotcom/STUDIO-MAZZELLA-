-- ============================================================
-- MIGRAZIONE: Registratore Cassa → Supabase
-- Esegui questa query nel SQL Editor di Supabase
-- ============================================================

CREATE TABLE IF NOT EXISTS registrazioni_cassa (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id      uuid REFERENCES clienti(id) ON DELETE CASCADE,
  data            date NOT NULL,
  ora_registrazione text,
  created_at      timestamptz DEFAULT now()
);

-- Indice per velocizzare le query per data
CREATE INDEX IF NOT EXISTS idx_registrazioni_cassa_data
  ON registrazioni_cassa (data);

-- Indice per cliente
CREATE INDEX IF NOT EXISTS idx_registrazioni_cassa_cliente
  ON registrazioni_cassa (cliente_id);

-- Unicità: un cliente può essere registrato una sola volta per giorno
CREATE UNIQUE INDEX IF NOT EXISTS idx_registrazioni_cassa_unique
  ON registrazioni_cassa (cliente_id, data);

-- Row Level Security (opzionale — attiva se usi RLS nel progetto)
-- ALTER TABLE registrazioni_cassa ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Autenticati possono leggere" ON registrazioni_cassa FOR SELECT USING (auth.role() = 'authenticated');
-- CREATE POLICY "Autenticati possono scrivere" ON registrazioni_cassa FOR ALL USING (auth.role() = 'authenticated');
