-- ============================================================
-- Ugest ERP – Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ─── Helper: format_doc_number ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION format_doc_number(prefix TEXT, seq BIGINT)
RETURNS TEXT LANGUAGE SQL IMMUTABLE AS $$
  SELECT prefix || '-' || LPAD(seq::TEXT, 4, '0');
$$;

-- ─── profiles (extends auth.users) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT,
  email       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own profile" ON public.profiles;
CREATE POLICY "Users manage own profile"
  ON public.profiles FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
-- SECURITY DEFINER + SET search_path = public ensures the function
-- can always resolve the profiles table regardless of caller context.
-- The inner EXCEPTION block ensures that ANY failure in profile creation
-- never blocks the auth signup (the trigger must always RETURN NEW).
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    INSERT INTO public.profiles (id, name, email)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data ->> 'name',
      NEW.email
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Never block auth signup due to profile creation failure
    NULL;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── stock_items ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stock_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  sku          TEXT NOT NULL,
  category     TEXT NOT NULL,
  category_pt  TEXT NOT NULL,
  stock_level  INTEGER NOT NULL DEFAULT 0,
  max_stock    INTEGER NOT NULL DEFAULT 100,
  price        NUMERIC(12,2) NOT NULL DEFAULT 0,
  warehouse    TEXT NOT NULL,
  warehouse_pt TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own stock_items"
  ON stock_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── invoices ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seq_number   BIGINT GENERATED ALWAYS AS IDENTITY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client       TEXT NOT NULL,
  client_nuit  TEXT,
  description  TEXT,
  amount       NUMERIC(12,2) NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Paid','Pending','Overdue')),
  issue_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date     DATE,
  logo_bg      TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own invoices"
  ON invoices FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── quotes ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quotes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seq_number    BIGINT GENERATED ALWAYS AS IDENTITY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client        TEXT NOT NULL,
  client_nuit   TEXT,
  description   TEXT,
  amount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Approved','Pending','Rejected')),
  issue_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  validity_days INTEGER NOT NULL DEFAULT 15,
  logo_bg       TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own quotes"
  ON quotes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── receipts ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS receipts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seq_number   BIGINT GENERATED ALWAYS AS IDENTITY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_id   UUID REFERENCES invoices(id) ON DELETE SET NULL,
  invoice_ref  TEXT NOT NULL DEFAULT '',
  client       TEXT NOT NULL,
  amount       NUMERIC(12,2) NOT NULL DEFAULT 0,
  method       TEXT NOT NULL DEFAULT 'Bank Transfer',
  method_pt    TEXT NOT NULL DEFAULT 'Transferência Bancária',
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own receipts"
  ON receipts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── expenses ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seq_number   BIGINT GENERATED ALWAYS AS IDENTITY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  merchant     TEXT NOT NULL,
  category     TEXT NOT NULL,
  category_pt  TEXT NOT NULL,
  amount       NUMERIC(12,2) NOT NULL DEFAULT 0,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status       TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Approved','Pending','Rejected')),
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own expenses"
  ON expenses FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── contacts ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contacts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  email        TEXT NOT NULL,
  phone        TEXT DEFAULT '',
  company      TEXT NOT NULL,
  role         TEXT NOT NULL,
  role_pt      TEXT NOT NULL,
  avatar_color TEXT DEFAULT 'bg-indigo-600',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own contacts"
  ON contacts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
