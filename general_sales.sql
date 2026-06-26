-- VENDAS GERAIS — vendas avulsas sem documento fiscal
-- Run this in Supabase SQL editor

CREATE TABLE IF NOT EXISTS general_sales (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seq_number    INTEGER NOT NULL DEFAULT 1,
  product_id    UUID REFERENCES stock_items(id) ON DELETE SET NULL,
  product_name  TEXT NOT NULL,
  sku           TEXT NOT NULL DEFAULT '',
  quantity      INTEGER NOT NULL DEFAULT 1,
  unit_price    NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_amount  NUMERIC(14,2) NOT NULL DEFAULT 0,
  sale_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method  TEXT NOT NULL DEFAULT 'Físico' CHECK (payment_method IN ('Físico', 'M-Pesa', 'E-mola', 'Banco')),
  notes           TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, seq_number)
);

ALTER TABLE general_sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own general_sales" ON general_sales;
CREATE POLICY "Users manage own general_sales" ON general_sales
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS general_sales_user_date ON general_sales(user_id, sale_date DESC);
CREATE INDEX IF NOT EXISTS general_sales_user_seq  ON general_sales(user_id, seq_number DESC);

-- Trigger: auto-increment seq_number per user
CREATE OR REPLACE FUNCTION general_sales_set_seq()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  SELECT COALESCE(MAX(seq_number), 0) + 1
    INTO NEW.seq_number
    FROM general_sales
   WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_general_sales_seq ON general_sales;
CREATE TRIGGER trg_general_sales_seq
  BEFORE INSERT ON general_sales
  FOR EACH ROW EXECUTE FUNCTION general_sales_set_seq();
