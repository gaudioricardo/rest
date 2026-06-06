-- ============================================================
-- Ugest ERP — Migration: Multi-company Profile & Document Notes
-- Aplicar via: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Segunda empresa armazenada como JSON em company_settings
ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS secondary_company JSONB DEFAULT NULL;

-- 2. Facturas: empresa emissora + notas
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS company_profile_id TEXT NOT NULL DEFAULT 'primary',
  ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL;

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_company_profile_id_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_company_profile_id_check
  CHECK (company_profile_id IN ('primary', 'secondary'));

-- 3. Cotações: empresa emissora + notas
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS company_profile_id TEXT NOT NULL DEFAULT 'primary',
  ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL;

ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_company_profile_id_check;
ALTER TABLE quotes ADD CONSTRAINT quotes_company_profile_id_check
  CHECK (company_profile_id IN ('primary', 'secondary'));

-- 4. Recibos: empresa emissora + notas
ALTER TABLE receipts
  ADD COLUMN IF NOT EXISTS company_profile_id TEXT NOT NULL DEFAULT 'primary',
  ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL;

ALTER TABLE receipts DROP CONSTRAINT IF EXISTS receipts_company_profile_id_check;
ALTER TABLE receipts ADD CONSTRAINT receipts_company_profile_id_check
  CHECK (company_profile_id IN ('primary', 'secondary'));
