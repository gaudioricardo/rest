import { createClient } from 'jsr:@supabase/supabase-js@2';
import { AwsV4Signer } from 'npm:aws4fetch@1.0.20';
import { RECEIPT_TYPES, requireOwnedKey, validateReceipt } from '../../../shared/receipts.ts';
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return json({ error: 'Unauthorized' }, 401);
  const region = Deno.env.get('B2_REGION');
  const bucket = Deno.env.get('B2_BUCKET_NAME');
  const accessKeyId = Deno.env.get('B2_KEY_ID');
  const secretAccessKey = Deno.env.get('B2_APPLICATION_KEY');
  if (!region || !bucket || !accessKeyId || !secretAccessKey) return json({ error: 'B2 not configured' }, 503);
  try {
    const reader = req.body?.getReader();
    if (!reader) return json({ error: 'Body required' }, 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4096) { await reader.cancel(); return json({ error: 'Request too large' }, 413); }
      chunks.push(value);
    }
    const buffer = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.byteLength; }
    const text = new TextDecoder().decode(buffer);
    const body = JSON.parse(text);
    const upload = body.action === 'upload';
    if (!upload && body.action !== 'download') return json({ error: 'Invalid action' }, 400);
    let key: string;
    const headers: Record<string, string> = {};
    if (upload) {
      validateReceipt(body.contentType, body.size);
      key = `expenses/${user.id}/${crypto.randomUUID()}.${RECEIPT_TYPES[body.contentType]}`;
      headers['Content-Type'] = body.contentType;
      headers['Content-Length'] = String(body.size);
    } else key = requireOwnedKey(body.key, user.id);
    const url = new URL(`https://s3.${region}.backblazeb2.com/${encodeURIComponent(bucket)}/${key.split('/').map(encodeURIComponent).join('/')}`);
    url.searchParams.set('X-Amz-Expires', '120');
    const signed = await new AwsV4Signer({
      url: url.toString(), method: upload ? 'PUT' : 'GET', headers,
      accessKeyId, secretAccessKey, service: 's3', region, signQuery: true, allHeaders: true,
    }).sign();
    return json({ url: signed.url.toString(), key, expiresIn: 120 });
  } catch { return json({ error: 'Invalid receipt request' }, 400); }
});
