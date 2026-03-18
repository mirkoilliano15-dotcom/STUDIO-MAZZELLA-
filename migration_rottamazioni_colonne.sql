-- Aggiunge le colonne per il nuovo design Rottamazioni
-- Esegui nel SQL Editor di Supabase

ALTER TABLE rottamazioni
  ADD COLUMN IF NOT EXISTS prospetto          TEXT DEFAULT '—',
  ADD COLUMN IF NOT EXISTS cartella           TEXT DEFAULT '—',
  ADD COLUMN IF NOT EXISTS rottamazione_stato TEXT DEFAULT '—',
  ADD COLUMN IF NOT EXISTS rate_stato         TEXT DEFAULT '—';
