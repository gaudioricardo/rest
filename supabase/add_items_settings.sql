-- invoice_items
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity    NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price  NUMERIC(12,2) NOT NULL DEFAULT 0,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invoice_items_policy" ON public.invoice_items;
CREATE POLICY "invoice_items_policy" ON public.invoice_items FOR ALL
  USING (auth.uid() = (SELECT user_id FROM public.invoices WHERE id = invoice_id))
  WITH CHECK (auth.uid() = (SELECT user_id FROM public.invoices WHERE id = invoice_id));

-- quote_items
CREATE TABLE IF NOT EXISTS public.quote_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id    UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity    NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price  NUMERIC(12,2) NOT NULL DEFAULT 0,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "quote_items_policy" ON public.quote_items;
CREATE POLICY "quote_items_policy" ON public.quote_items FOR ALL
  USING (auth.uid() = (SELECT user_id FROM public.quotes WHERE id = quote_id))
  WITH CHECK (auth.uid() = (SELECT user_id FROM public.quotes WHERE id = quote_id));

-- company_settings
CREATE TABLE IF NOT EXISTS public.company_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name    TEXT DEFAULT '',
  nuit            TEXT DEFAULT '',
  address         TEXT DEFAULT '',
  city            TEXT DEFAULT '',
  phone           TEXT DEFAULT '',
  email           TEXT DEFAULT '',
  logo_base64     TEXT,
  stamp_base64    TEXT,
  bank_accounts   JSONB DEFAULT '[]'::jsonb,
  mobile_contacts JSONB DEFAULT '[]'::jsonb,
  setup_complete  BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "company_settings_policy" ON public.company_settings;
CREATE POLICY "company_settings_policy" ON public.company_settings FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
