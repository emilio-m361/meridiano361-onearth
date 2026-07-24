-- Multi-scenario budget support
-- 1. Add sourceType / sourceOrderId to budget_scenario_meta
ALTER TABLE "budget_scenario_meta"
  ADD COLUMN IF NOT EXISTS "source_type"     TEXT,
  ADD COLUMN IF NOT EXISTS "source_order_id" TEXT;

-- 2. Rename existing default budgets to "Budget PE27 Cremona"
UPDATE "budget_scenario_meta"
  SET "nome" = 'Budget PE27 Cremona'
  WHERE "nome" = 'Budget principale';

-- 3. Drop old unique constraint (orgId, seasonCode) and add (orgId, seasonCode, nome)
ALTER TABLE "budget_scenario_meta"
  DROP CONSTRAINT IF EXISTS "budget_scenario_meta_organizationId_seasonCode_key";
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'budget_scenario_meta_org_season_nome_key') THEN
    ALTER TABLE "budget_scenario_meta"
      ADD CONSTRAINT "budget_scenario_meta_org_season_nome_key"
      UNIQUE ("organizationId", "seasonCode", "nome");
  END IF;
END $$;

-- 4. Add scenario_id to data tables (nullable first for migration)
ALTER TABLE "budget_settori"       ADD COLUMN IF NOT EXISTS "scenario_id" TEXT;
ALTER TABLE "budget_family_inputs" ADD COLUMN IF NOT EXISTS "scenario_id" TEXT;
ALTER TABLE "budget_subclass_data" ADD COLUMN IF NOT EXISTS "scenario_id" TEXT;

-- 5. Fill scenario_id from the matching budget_scenario_meta row
UPDATE "budget_settori" s
  SET "scenario_id" = (
    SELECT m."id" FROM "budget_scenario_meta" m
    WHERE m."organizationId" = s.organization_id
      AND m."seasonCode"     = s.season_code
    LIMIT 1
  )
  WHERE "scenario_id" IS NULL;

UPDATE "budget_family_inputs" f
  SET "scenario_id" = (
    SELECT m."id" FROM "budget_scenario_meta" m
    WHERE m."organizationId" = f."organizationId"
      AND m."seasonCode"     = f."seasonCode"
    LIMIT 1
  )
  WHERE "scenario_id" IS NULL;

UPDATE "budget_subclass_data" d
  SET "scenario_id" = (
    SELECT m."id" FROM "budget_scenario_meta" m
    WHERE m."organizationId" = d."organizationId"
      AND m."seasonCode"     = d."seasonCode"
    LIMIT 1
  )
  WHERE "scenario_id" IS NULL;

-- 6. Remove any orphaned rows that couldn't be linked
DELETE FROM "budget_settori"       WHERE "scenario_id" IS NULL;
DELETE FROM "budget_family_inputs" WHERE "scenario_id" IS NULL;
DELETE FROM "budget_subclass_data" WHERE "scenario_id" IS NULL;

-- 7. Make scenario_id NOT NULL
ALTER TABLE "budget_settori"       ALTER COLUMN "scenario_id" SET NOT NULL;
ALTER TABLE "budget_family_inputs" ALTER COLUMN "scenario_id" SET NOT NULL;
ALTER TABLE "budget_subclass_data" ALTER COLUMN "scenario_id" SET NOT NULL;

-- 8. Add FK constraints (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'budget_settori_scenario_id_fkey') THEN
    ALTER TABLE "budget_settori"
      ADD CONSTRAINT "budget_settori_scenario_id_fkey"
      FOREIGN KEY ("scenario_id") REFERENCES "budget_scenario_meta"("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'budget_family_inputs_scenario_id_fkey') THEN
    ALTER TABLE "budget_family_inputs"
      ADD CONSTRAINT "budget_family_inputs_scenario_id_fkey"
      FOREIGN KEY ("scenario_id") REFERENCES "budget_scenario_meta"("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'budget_subclass_data_scenario_id_fkey') THEN
    ALTER TABLE "budget_subclass_data"
      ADD CONSTRAINT "budget_subclass_data_scenario_id_fkey"
      FOREIGN KEY ("scenario_id") REFERENCES "budget_scenario_meta"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- 9. Drop old unique constraints on data tables
ALTER TABLE "budget_settori"
  DROP CONSTRAINT IF EXISTS "budget_settori_organization_id_season_code_nome_key";
ALTER TABLE "budget_settori"
  DROP CONSTRAINT IF EXISTS "budget_settori_organizationId_seasonCode_nome_key";

ALTER TABLE "budget_family_inputs"
  DROP CONSTRAINT IF EXISTS "budget_family_inputs_org_season_famiglia_key";
ALTER TABLE "budget_family_inputs"
  DROP CONSTRAINT IF EXISTS "budget_family_inputs_organizationId_seasonCode_famiglia_key";

ALTER TABLE "budget_subclass_data"
  DROP CONSTRAINT IF EXISTS "budget_subclass_data_org_season_famiglia_sottoclasse_key";
ALTER TABLE "budget_subclass_data"
  DROP CONSTRAINT IF EXISTS "budget_subclass_data_organizationId_seasonCode_famiglia_sottoc_key";

-- 10. Add new unique constraints keyed by scenarioId (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'budget_settori_scenario_id_nome_key') THEN
    ALTER TABLE "budget_settori"
      ADD CONSTRAINT "budget_settori_scenario_id_nome_key"
      UNIQUE ("scenario_id", "nome");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'budget_family_inputs_scenario_id_famiglia_key') THEN
    ALTER TABLE "budget_family_inputs"
      ADD CONSTRAINT "budget_family_inputs_scenario_id_famiglia_key"
      UNIQUE ("scenario_id", "famiglia");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'budget_subclass_data_scenario_id_famiglia_sottoclasse_key') THEN
    ALTER TABLE "budget_subclass_data"
      ADD CONSTRAINT "budget_subclass_data_scenario_id_famiglia_sottoclasse_key"
      UNIQUE ("scenario_id", "famiglia", "sottoclasse");
  END IF;
END $$;
