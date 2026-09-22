import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from './supabase';
import { receiptKey, validateReceipt } from '../../shared/receipts';

export async function uploadReceiptImage(localUri: string, _userId: string): Promise<string> {
  const ext = localUri.split('.').pop()?.split('?')[0]?.toLowerCase();
  const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'pdf' ? 'application/pdf' : 'image/jpeg';
  const info = await FileSystem.getInfoAsync(localUri);
  if (!info.exists || info.isDirectory) throw new Error('Comprovativo não encontrado.');
  validateReceipt(contentType, info.size);
  const { data, error } = await supabase.functions.invoke('receipt-url', {
    body: { action: 'upload', contentType, size: info.size },
  });
  if (error) throw error;
  const result = await FileSystem.uploadAsync(data.url, localUri, {
    httpMethod: 'PUT', uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: { 'Content-Type': contentType },
  });
  if (result.status < 200 || result.status >= 300) throw new Error(`Falha no envio (${result.status}).`);
  return data.key;
}

// Preserve native binary downloads: bytes never pass through JS or Supabase.
export async function fetchReceiptLocalUri(reference: string): Promise<string> {
  const key = receiptKey(reference);
  const { data, error } = await supabase.functions.invoke('receipt-url', {
    body: { action: 'download', key },
  });
  if (error) throw error;
  const extension = key.split('.').pop()?.toLowerCase().match(/^[a-z0-9]+$/)?.[0] ?? 'jpg';
  const path = `${FileSystem.cacheDirectory}receipt_${Date.now()}.${extension}`;
  const result = await FileSystem.downloadAsync(data.url, path);
  if (result.status !== 200) throw new Error(`Falha na leitura (${result.status}).`);
  return result.uri;
}
