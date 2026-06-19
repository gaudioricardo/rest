import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import type { IncomingMessage, ServerResponse } from 'http';
import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';

function b2UploadPlugin(
  b2KeyId: string,
  b2AppKey: string,
  b2BucketId: string,
  b2BucketName: string,
): Plugin {
  async function handleUpload(req: IncomingMessage, res: ServerResponse) {
    if (!b2KeyId || !b2AppKey || !b2BucketId) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'B2 not configured — fill VITE_B2_* in .env' }));
      return;
    }

    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body: { fileName: string; contentType: string; fileData: string } =
      JSON.parse(Buffer.concat(chunks).toString('utf-8'));

    // 1. Authorize
    const creds = Buffer.from(`${b2KeyId}:${b2AppKey}`).toString('base64');
    const authRes = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
      headers: { Authorization: `Basic ${creds}` },
    });
    if (!authRes.ok) {
      const detail = await authRes.text().catch(() => '');
      throw new Error(`B2 auth failed (${authRes.status}): ${detail}`);
    }
    const auth: { authorizationToken: string; apiUrl: string; downloadUrl: string } =
      await authRes.json();

    // 2. Get upload URL
    const urlRes = await fetch(`${auth.apiUrl}/b2api/v2/b2_get_upload_url`, {
      method: 'POST',
      headers: { Authorization: auth.authorizationToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ bucketId: b2BucketId }),
    });
    if (!urlRes.ok) {
      const detail = await urlRes.text().catch(() => '');
      throw new Error(`B2 get_upload_url failed (${urlRes.status}): ${detail}`);
    }
    const uploadInfo: { uploadUrl: string; authorizationToken: string } = await urlRes.json();

    // 3. Upload — Node 22 native fetch (undici) sets Content-Length automatically
    //    from the body; setting it manually causes a conflict and 500 error.
    const fileBytes = new Uint8Array(Buffer.from(body.fileData, 'base64'));
    const uploadRes = await fetch(uploadInfo.uploadUrl, {
      method: 'POST',
      headers: {
        Authorization:      uploadInfo.authorizationToken,
        'X-Bz-File-Name':   encodeURIComponent(body.fileName),
        'Content-Type':     body.contentType || 'application/octet-stream',
        'X-Bz-Content-Sha1': 'do_not_verify',
      },
      body: fileBytes,
    });
    if (!uploadRes.ok) {
      const detail = await uploadRes.text().catch(() => '');
      throw new Error(`B2 upload failed (${uploadRes.status}): ${detail}`);
    }

    const downloadUrl = `${auth.downloadUrl}/file/${b2BucketName}/${body.fileName}`;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ url: downloadUrl }));
  }

  const middleware = (server: { middlewares: { use: Function } }) => {
    server.middlewares.use(
      '/api/b2/upload',
      (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (req.method !== 'POST') { next(); return; }
        handleUpload(req, res).catch((err) => {
          console.error('[B2 Upload]', err);
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: String(err) }));
          }
        });
      },
    );
  };

  return {
    name: 'b2-upload-api',
    configureServer: middleware,
    configurePreviewServer: middleware,
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      b2UploadPlugin(
        env.VITE_B2_KEY_ID ?? '',
        env.VITE_B2_APPLICATION_KEY ?? '',
        env.VITE_B2_BUCKET_ID ?? '',
        env.VITE_B2_BUCKET_NAME ?? '',
      ),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
