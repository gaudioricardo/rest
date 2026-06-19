import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
};

// The UFSA list page is server-side PHP — simple GET returns full HTML with all rows
const UFSA_LIST = 'https://www.ufsa.gov.mz/concursos.php';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** Split a TD's innerHTML by <br> and return cleaned text lines */
function cellLines(cellHtml: string): string[] {
  return cellHtml
    .split(/<br\s*\/?>/i)
    .map(p => stripHtml(p))
    .filter(Boolean);
}

function parseDate(raw: string | null): string | null {
  if (!raw) return null;
  const iso = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return iso ? iso[1] : null;
}

// ─── HTML table structure (from ufsa.gov.mz/concursos.php):
//
//  <tr align="left">
//    <td width="170">MODALIDADE:<br>REF_LINE1<br>REF_LINE2<br>
//                   <a href="concurso_detalhes.php?referencia=FULL_REF">Ver detalhes</a></td>
//    <td width="200">CLASSE:<br> OBJETO_GERAL <br><br></td>
//    <td width="175">UGEA <br><br></td>
//    <td width="100">PROVINCIA</td>
//    <td width="65" align="right">YYYY-MM-DD</td>
//    <td width="75" align="right">YYYY-MM-DD<br>HHHOO<br></td>
//  </tr>
// ─────────────────────────────────────────────────────────────────────────────

interface Oportunidade {
  referencia: string;
  numero_concurso: string | null;
  regime: string | null;
  modalidade: string | null;
  classe: string | null;
  objeto_geral: string | null;
  ugea: string | null;
  moeda: string;
  valor_estimado: number | null;
  garantia_provisoria: number | null;
  criterio_adjudicacao: string | null;
  data_lancamento: string | null;
  numero_lotes: string | null;
  entrega_propostas: string | null;
  data_abertura: string | null;
  hora_entrega: string | null;
  hora_abertura: string | null;
  observacoes: string | null;
  data_publicacao: string | null;
  actualizado_em: string;
}

function parseListPage(html: string): Oportunidade[] {
  const now = new Date().toISOString();
  const results: Oportunidade[] = [];

  // Each data row has align="left" and contains a "Ver detalhes" link
  const rowReg = /<tr\s+align="left">([\s\S]*?)<\/tr>/gi;
  let rowM: RegExpExecArray | null;

  while ((rowM = rowReg.exec(html)) !== null) {
    const row = rowM[1];

    // Referência comes from the href — the display text is split across multiple <br>
    const hrefM = row.match(/concurso_detalhes\.php\?referencia=([^"]+)/i);
    if (!hrefM) continue;
    const referencia = hrefM[1].trim();
    if (!referencia) continue;

    // Extract the 6 TDs
    const tds: string[] = [];
    const tdReg = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let tdM: RegExpExecArray | null;
    while ((tdM = tdReg.exec(row)) !== null) tds.push(tdM[1]);
    if (tds.length < 6) continue;

    // td[0] lines: ["CONCURSO LIMITADO", "ref_part1", "ref_part2", "Ver detalhes"]
    const td0 = cellLines(tds[0]);
    const modalidade = (td0[0] ?? '').replace(/:$/, '').trim().toUpperCase() || null;

    // td[1] lines: ["SERVICO", "objeto geral text"]
    const td1 = cellLines(tds[1]);
    const classe     = (td1[0] ?? '').replace(/:$/, '').trim().toUpperCase() || null;
    const objeto_geral = td1.slice(1).join(' ').trim() || null;

    // td[2]: UGEA
    const ugea = stripHtml(tds[2]).trim() || null;

    // td[3]: Provincia — stored in observacoes (not in schema directly)
    const provincia = stripHtml(tds[3]).trim() || null;

    // td[4]: data_lancamento
    const data_lancamento = parseDate(stripHtml(tds[4]).trim());

    // td[5]: "YYYY-MM-DD<br>HHH00" — date + hour
    const td5 = cellLines(tds[5]);
    const data_abertura  = parseDate((td5[0] ?? '').trim());
    const hora_abertura  = (td5[1] ?? '').trim().toUpperCase() || null;

    results.push({
      referencia,
      numero_concurso:     referencia,
      regime:              null,
      modalidade,
      classe,
      objeto_geral,
      ugea,
      moeda:               'MZN',
      valor_estimado:      null,
      garantia_provisoria: null,
      criterio_adjudicacao: null,
      data_lancamento,
      numero_lotes:        null,
      entrega_propostas:   null,
      data_abertura,
      hora_entrega:        null,
      hora_abertura,
      observacoes:         provincia,
      data_publicacao:     null,
      actualizado_em:      now,
    });
  }

  return results;
}

// ─── Deno serve ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  const authHeader     = req.headers.get('Authorization') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const isServiceRole  = authHeader === `Bearer ${serviceRoleKey}`;

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  if (!isServiceRole) {
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { error } = await anonClient.auth.getUser();
    if (error) return json({ error: 'Unauthorized' }, 401);
  }

  try {
    const res = await fetch(UFSA_LIST, {
      headers: {
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-MZ,pt;q=0.9',
      },
    });

    if (!res.ok) {
      return json({ error: `UFSA site returned HTTP ${res.status}` }, 502);
    }

    const html = await res.text();
    const records = parseListPage(html);

    if (records.length === 0) {
      return json({
        success: false,
        message: 'Zero rows parsed — the page structure may have changed',
        html_preview: html.slice(0, 500),
        total: 0,
      });
    }

    const { error: upsertErr } = await supabase
      .from('oportunidades')
      .upsert(records, { onConflict: 'referencia', ignoreDuplicates: false });

    if (upsertErr) {
      console.error('Upsert error:', upsertErr);
      return json({ error: upsertErr.message }, 500);
    }

    return json({ success: true, total: records.length });
  } catch (err) {
    console.error('Scraper error:', err);
    return json({ error: String(err) }, 500);
  }
});
