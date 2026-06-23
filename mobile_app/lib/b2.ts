import * as FileSystem from 'expo-file-system';
import { supabase } from './supabase';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';

export async function uploadReceiptImage(localUri: string, userId: string): Promise<string> {
  const ext = localUri.split('.').pop()?.split('?')[0]?.toLowerCase() ?? 'jpg';
  const fileName = `expenses/${userId}/${Date.now()}_receipt.${ext}`;
  const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';

  const fileData = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const { data, error } = await supabase.functions.invoke('upload-receipt', {
    body: { fileName, contentType, fileData },
  });

  if (error) throw new Error(`Upload failed: ${error.message}`);
  if (!data?.url) throw new Error('Upload failed: no URL returned');
  return data.url as string;
}

function b2UrlToKey(b2Url: string): string {
  const match = b2Url.match(/\/file\/[^/]+\/(.+)/);
  return match ? match[1] : b2Url;
}

// Downloads the receipt image to the local cache directory.
// Returns a file:// URI safe to use directly in <Image source={{ uri }}>
// Uses FileSystem.downloadAsync so the binary never passes through JS memory.
export async function fetchReceiptLocalUri(b2Url: string): Promise<string> {
  const key = b2UrlToKey(b2Url);
  console.log('[b2] fetchReceiptLocalUri key:', key);

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) console.error('[b2] session error:', sessionError.message);
  const token = sessionData?.session?.access_token;
  if (!token) throw new Error('Not authenticated');
  console.log('[b2] token present:', true);

  const endpoint = `${SUPABASE_URL}/functions/v1/view-receipt?key=${encodeURIComponent(key)}`;
  console.log('[b2] downloadAsync →', endpoint);

  // Unique filename per request to avoid cache collisions
  const ext = key.split('.').pop()?.split('?')[0] ?? 'jpg';
  const localPath = `${FileSystem.cacheDirectory}receipt_${Date.now()}.${ext}`;

  const result = await FileSystem.downloadAsync(endpoint, localPath, {
    headers: { Authorization: `Bearer ${token}` },
  });

  console.log('[b2] downloadAsync status:', result.status, 'uri:', result.uri);

  if (result.status !== 200) {
    throw new Error(`Receipt download failed: HTTP ${result.status}`);
  }

  return result.uri;
}
