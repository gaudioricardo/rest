import { supabase } from './supabase';

// Upload: Vite middleware em dev, Edge Function Supabase em prod
export async function uploadReceiptImage(file: File, userId: string): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const fileName = `expenses/${userId}/${Date.now()}_receipt.${ext}`;
  const fileData = await fileToBase64(file);

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  let endpoint: string;

  if (import.meta.env.DEV) {
    endpoint = '/api/b2/upload';
  } else {
    endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-receipt`;
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({ fileName, contentType: file.type || 'image/jpeg', fileData }),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => 'Upload failed');
    throw new Error(msg);
  }

  const { url } = await res.json() as { url: string };
  return url;
}

// Extrai key B2 de qualquer URL de download B2
function b2UrlToKey(b2Url: string): string {
  const match = b2Url.match(/\/file\/[^/]+\/(.+)/);
  return match ? match[1] : b2Url;
}

// Visualização: proxy Vite em dev (sem CORS), Edge Function em prod
export async function fetchReceiptObjectUrl(b2Url: string): Promise<string> {
  const key = b2UrlToKey(b2Url);
  let endpoint: string;
  const headers: Record<string, string> = {};

  if (import.meta.env.DEV) {
    endpoint = `/api/b2/view?key=${encodeURIComponent(key)}`;
  } else {
    endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/view-receipt?key=${encodeURIComponent(key)}`;
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  const res = await fetch(endpoint, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
