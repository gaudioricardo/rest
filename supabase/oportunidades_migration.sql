-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: tabela oportunidades (concursos públicos UFSA)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.oportunidades (
  referencia              TEXT PRIMARY KEY,
  numero_concurso         TEXT,
  regime                  TEXT,
  modalidade              TEXT,
  classe                  TEXT,
  objeto_geral            TEXT,
  ugea                    TEXT,
  moeda                   TEXT DEFAULT 'MZN',
  valor_estimado          NUMERIC(18,2),
  garantia_provisoria     NUMERIC(18,2),
  criterio_adjudicacao    TEXT,
  data_lancamento         DATE,
  numero_lotes            TEXT,
  entrega_propostas       TEXT,
  data_abertura           DATE,
  hora_entrega            TEXT,
  hora_abertura           TEXT,
  observacoes             TEXT,
  data_publicacao         TIMESTAMPTZ,
  actualizado_em          TIMESTAMPTZ DEFAULT now()
);

-- Índices para filtros e ordenação rápida
CREATE INDEX IF NOT EXISTS idx_oportunidades_modalidade    ON public.oportunidades(modalidade);
CREATE INDEX IF NOT EXISTS idx_oportunidades_classe        ON public.oportunidades(classe);
CREATE INDEX IF NOT EXISTS idx_oportunidades_moeda         ON public.oportunidades(moeda);
CREATE INDEX IF NOT EXISTS idx_oportunidades_regime        ON public.oportunidades(regime);
CREATE INDEX IF NOT EXISTS idx_oportunidades_data_abertura ON public.oportunidades(data_abertura ASC);
CREATE INDEX IF NOT EXISTS idx_oportunidades_actualizado   ON public.oportunidades(actualizado_em DESC);

-- RLS: leitura pública (concursos são informação pública), escrita apenas pela service role
ALTER TABLE public.oportunidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "oportunidades_read_all" ON public.oportunidades
  FOR SELECT USING (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- pg_cron: sincronização automática a cada 6 horas
-- Substitua <PROJECT_REF> e <SERVICE_ROLE_KEY> pelos valores reais do projecto.
-- ═══════════════════════════════════════════════════════════════════════════

SELECT cron.schedule(
  'ufsa-sync',
  '0 */6 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/ufsa-scraper',
      headers := jsonb_build_object(
        'Authorization', 'Bearer <SERVICE_ROLE_KEY>',
        'Content-Type',  'application/json'
      ),
      body    := '{}'::jsonb
    ) AS request_id;
  $$
);
