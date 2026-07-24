CREATE TABLE IF NOT EXISTS "budget_scenario_meta" (
  "id"             TEXT         NOT NULL,
  "organizationId" TEXT         NOT NULL,
  "seasonCode"     TEXT         NOT NULL DEFAULT 'PE27',
  "nome"           TEXT         NOT NULL DEFAULT 'Budget principale',
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "budget_scenario_meta_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "budget_scenario_meta_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "budget_scenario_meta_organizationId_seasonCode_key"
    UNIQUE ("organizationId", "seasonCode")
);

CREATE TABLE IF NOT EXISTS "budget_family_inputs" (
  "id"                TEXT           NOT NULL,
  "organizationId"    TEXT           NOT NULL,
  "seasonCode"        TEXT           NOT NULL DEFAULT 'PE27',
  "famiglia"          TEXT           NOT NULL,
  "vendutoPrevValore" DECIMAL(12, 2),
  "vendutoPrevPezzi"  INTEGER,
  "mesiConsuntivi"    INTEGER        NOT NULL DEFAULT 4,
  "obiettivo"         DECIMAL(12, 2),
  "marginePieno"      DECIMAL(5, 2),
  "scontoMese5"       DECIMAL(5, 2),
  "scontoMese6"       DECIMAL(5, 2),
  "createdAt"         TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "budget_family_inputs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "budget_family_inputs_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "budget_family_inputs_org_season_famiglia_key"
    UNIQUE ("organizationId", "seasonCode", "famiglia")
);

CREATE TABLE IF NOT EXISTS "budget_subclass_data" (
  "id"             TEXT         NOT NULL,
  "organizationId" TEXT         NOT NULL,
  "seasonCode"     TEXT         NOT NULL DEFAULT 'PE27',
  "famiglia"       TEXT         NOT NULL,
  "sottoclasse"    TEXT         NOT NULL,
  "pezziPE25"      INTEGER,
  "pezziPE26"      INTEGER,
  "continuativi"   INTEGER      NOT NULL DEFAULT 0,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "budget_subclass_data_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "budget_subclass_data_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "budget_subclass_data_org_season_famiglia_sottoclasse_key"
    UNIQUE ("organizationId", "seasonCode", "famiglia", "sottoclasse")
);
