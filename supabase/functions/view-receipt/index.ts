import { createClient } from 'jsr:@supabase/supabase-js@2';

const B2_KEY_ID     = Deno.env.get('B2_KEY_ID') ?? '';
const B2_APP_KEY    = Deno.env.get('B2_APPLICATION_KEY') ?? '';
const B2_BUCKET_NAME = Deno.env.get('B2_BUCKET_NAME') ?? '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  // Verify Supabase JWT
  const authHeader = req.headers.get('Authorization') ?? '';
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return jsonRes({ error: 'Unauthorized' }, 401);

  // Accept key from query param (GET/web) or body (POST/mobile)
  let key: string | null = null;
  const url = new URL(req.url);

  if (req.method === 'GET') {
    key = url.searchParams.get('key');
  } else if (req.method === 'POST') {
    try {
      const body = await req.json();
      key = body.key ?? null;
    } catch {
      return jsonRes({ error: 'Invalid body' }, 400);
    }
  } else {
    return jsonRes({ error: 'Method not allowed' }, 405);
  }

  if (!key) return jsonRes({ error: 'Missing key' }, 400);

  // Only allow access to the authenticated user's own files
  if (!key.startsWith(`expenses/${user.id}/`)) return jsonRes({ error: 'Forbidden' }, 403);

  if (!B2_KEY_ID || !B2_APP_KEY || !B2_BUCKET_NAME) {
    return jsonRes({ error: 'B2 not configured on server' }, 503);
  }

  // 1. Authorise with B2
  const creds = btoa(`${B2_KEY_ID}:${B2_APP_KEY}`);
  const authRes = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
    headers: { Authorization: `Basic ${creds}` },
  });
  if (!authRes.ok) return jsonRes({ error: 'B2 auth failed' }, 502);
  const auth = await authRes.json();

  // 2. Download file from B2 with B2 auth token
  const downloadRes = await fetch(
    `${auth.downloadUrl}/file/${B2_BUCKET_NAME}/${key}`,
    { headers: { Authorization: auth.authorizationToken } },
  );
  if (!downloadRes.ok) return jsonRes({ error: 'File not found' }, 404);

  const contentType = downloadRes.headers.get('Content-Type') ?? 'image/jpeg';
  const body = await downloadRes.arrayBuffer();

  return new Response(body, {
    status: 200,
    headers: {
      ...CORS,
      'Content-Type': contentType,
      'Cache-Control': 'private, max-age=3600',
    },
  });
});

function jsonRes(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
