const KEY_ID = process.env.EXPO_PUBLIC_B2_KEY_ID ?? '';
const APP_KEY = process.env.EXPO_PUBLIC_B2_APPLICATION_KEY ?? '';
const BUCKET_ID = process.env.EXPO_PUBLIC_B2_BUCKET_ID ?? '';
const BUCKET_NAME = process.env.EXPO_PUBLIC_B2_BUCKET_NAME ?? '';

interface B2Auth {
  authorizationToken: string;
  apiUrl: string;
  downloadUrl: string;
}

interface B2UploadUrl {
  uploadUrl: string;
  authorizationToken: string;
}

export async function uploadReceiptImage(localUri: string, userId: string): Promise<string> {
  if (!KEY_ID || !APP_KEY || !BUCKET_ID) {
    throw new Error('Backblaze B2 não configurado — preencha as variáveis EXPO_PUBLIC_B2_* no .env');
  }

  const ext = localUri.split('.').pop()?.split('?')[0]?.toLowerCase() ?? 'jpg';
  const fileName = `expenses/${userId}/${Date.now()}_receipt.${ext}`;

  // 1. Authorize (React Native native fetch, no CORS restriction)
  const creds = btoa(`${KEY_ID}:${APP_KEY}`);
  const authRes = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
    headers: { Authorization: `Basic ${creds}` },
  });
  if (!authRes.ok) throw new Error('B2 auth failed');
  const auth: B2Auth = await authRes.json();

  // 2. Get upload URL
  const urlRes = await fetch(`${auth.apiUrl}/b2api/v2/b2_get_upload_url`, {
    method: 'POST',
    headers: { Authorization: auth.authorizationToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ bucketId: BUCKET_ID }),
  });
  if (!urlRes.ok) throw new Error('B2 get upload URL failed');
  const uploadInfo: B2UploadUrl = await urlRes.json();

  // 3. Upload blob (React Native fetch supports blob body)
  const fileRes = await fetch(localUri);
  const blob = await fileRes.blob();

  const uploadRes = await fetch(uploadInfo.uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: uploadInfo.authorizationToken,
      'X-Bz-File-Name': encodeURIComponent(fileName),
      'Content-Type': blob.type || 'image/jpeg',
      'X-Bz-Content-Sha1': 'do_not_verify',
    },
    body: blob,
  });
  if (!uploadRes.ok) throw new Error('B2 upload failed');

  return `${auth.downloadUrl}/file/${BUCKET_NAME}/${fileName}`;
}
