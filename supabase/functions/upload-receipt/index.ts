import { createClient } from 'jsr:@supabase/supabase-js@2';

const B2_KEY_ID     = Deno.env.get('B2_KEY_ID') ?? '';
const B2_APP_KEY    = Deno.env.get('B2_APPLICATION_KEY') ?? '';
const B2_BUCKET_ID  = Deno.env.get('B2_BUCKET_ID') ?? '';
const B2_BUCKET_NAME = Deno.env.get('B2_BUCKET_NAME') ?? '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  // Verify the caller's Supabase JWT
  const authHeader = req.headers.get('Authorization') ?? '';
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return json({ error: 'Unauthorized' }, 401);

  if (!B2_KEY_ID || !B2_APP_KEY || !B2_BUCKET_ID) {
    return json({ error: 'B2 not configured on server' }, 503);
  }

  const { fileName, contentType, fileData } =
    (await req.json()) as { fileName: string; contentType: string; fileData: string };

  // Ensure the upload path belongs to the authenticated user
  const expectedPrefix = `expenses/${user.id}/`;
  if (!fileName.startsWith(expectedPrefix)) {
    return json({ error: 'Forbidden' }, 403);
  }

  // 1. Authorize with B2
  const creds = btoa(`${B2_KEY_ID}:${B2_APP_KEY}`);
  const authRes = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
    headers: { Authorization: `Basic ${creds}` },
  });
  if (!authRes.ok) return json({ error: 'B2 auth failed' }, 502);
  const auth = await authRes.json();

  // 2. Get upload URL
  const urlRes = await fetch(`${auth.apiUrl}/b2api/v2/b2_get_upload_url`, {
    method: 'POST',
    headers: { Authorization: auth.authorizationToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ bucketId: B2_BUCKET_ID }),
  });
  if (!urlRes.ok) return json({ error: 'B2 get upload URL failed' }, 502);
  const uploadInfo = await urlRes.json();

  // 3. Upload
  const fileBytes = Uint8Array.from(atob(fileData), (c) => c.charCodeAt(0));
  const uploadRes = await fetch(uploadInfo.uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: uploadInfo.authorizationToken,
      'X-Bz-File-Name': encodeURIComponent(fileName),
      'Content-Type': contentType,
      'Content-Length': String(fileBytes.length),
      'X-Bz-Content-Sha1': 'do_not_verify',
    },
    body: fileBytes,
  });
  if (!uploadRes.ok) return json({ error: 'B2 upload failed' }, 502);

  const downloadUrl = `${auth.downloadUrl}/file/${B2_BUCKET_NAME}/${fileName}`;
  return json({ url: downloadUrl }, 200);
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
