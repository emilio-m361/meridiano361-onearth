ALTER TABLE "budget_scenario_meta"
  ADD COLUMN IF NOT EXISTS "note_generale" TEXT;

ALTER TABLE "budget_family_inputs"
  ADD COLUMN IF NOT EXISTS "note" TEXT;
