-- Add mesiPieno and mesiSaldi columns to budget_family_inputs
-- scontoMese5 is repurposed as margineSaldi (net margin % during sales period)
-- scontoMese6 is deprecated (kept for schema compat but no longer used in UI)
ALTER TABLE "budget_family_inputs"
  ADD COLUMN IF NOT EXISTS "mesi_pieno" INTEGER NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS "mesi_saldi" INTEGER NOT NULL DEFAULT 2;
