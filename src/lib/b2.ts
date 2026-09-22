import { supabase } from './supabase';
import { receiptKey, validateReceipt } from '../../shared/receipts';

export async function uploadReceiptImage(file: File, _userId: string): Promise<string> {
  validateReceipt(file.type, file.size);
  const { data, error } = await supabase.functions.invoke('receipt-url', {
    body: { action: 'upload', contentType: file.type, size: file.size },
  });
  if (error) throw error;
  const result = await fetch(data.url, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
  if (!result.ok) throw new Error(`Falha no envio do comprovativo (${result.status}).`);
  return data.key;
}

export async function fetchReceiptObjectUrl(reference: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('receipt-url', {
    body: { action: 'download', key: receiptKey(reference) },
  });
  if (error) throw error;
  const result = await fetch(data.url);
  if (!result.ok) throw new Error(`Falha na leitura do comprovativo (${result.status}).`);
  return URL.createObjectURL(await result.blob());
}
