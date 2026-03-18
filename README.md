# Migrations — Ordine di esecuzione su Supabase

Esegui nel SQL Editor di Supabase in questo ordine:

1. `MIGRATION_v9.sql`                     — note_clienti, scadenze, base tables
2. `migration_registrazioni_cassa.sql`    — registrazioni_cassa table
3. `migration_rottamazioni_colonne.sql`   — colonne rottamazioni (prospetto, cartella, ecc.)
4. `MIGRATION_rateizzi.sql`               — tabelle rateizzazioni + rate
5. `MIGRATION_rottamazioni.sql`           — tabelle rottamazioni aggiornate
6. `MIGRATION_v12.sql`                    — rate_rottamazione + forma_societaria clienti
7. `MIGRATION_moduli.sql`                 — moduli_template table

Se l'app è già in uso ed hai già eseguito alcune migration, esegui solo quelle mancanti.

## MIGRATION_v13.sql
- Aggiunge `indirizzo TEXT` a `clienti`
- Aggiunge `tipo TEXT` a `scadenze`  
- Aggiunge indici su scadenze e pratiche per performance
