ALTER TABLE "pareti_attrezzate"
  ADD COLUMN IF NOT EXISTS "source_order_id" TEXT,
  ADD COLUMN IF NOT EXISTS "source_cart_id"  TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pareti_source_order_fkey') THEN
    ALTER TABLE "pareti_attrezzate"
      ADD CONSTRAINT "pareti_source_order_fkey"
      FOREIGN KEY ("source_order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pareti_source_cart_fkey') THEN
    ALTER TABLE "pareti_attrezzate"
      ADD CONSTRAINT "pareti_source_cart_fkey"
      FOREIGN KEY ("source_cart_id") REFERENCES "carts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
