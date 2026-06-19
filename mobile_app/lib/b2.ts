import * as FileSystem from 'expo-file-system';
import { supabase } from './supabase';

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
