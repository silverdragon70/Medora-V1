import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { toast } from 'sonner';

export async function writeToCache(base64: string, filename: string): Promise<string> {
  const r = await Filesystem.writeFile({ path: filename, data: base64, directory: Directory.Cache });
  return r.uri;
}

export async function saveToDownloads(base64: string, filename: string) {
  try {
    await Filesystem.requestPermissions();
    await Filesystem.writeFile({
      path: `Download/${filename}`, data: base64,
      directory: Directory.ExternalStorage, recursive: true,
    });
    toast.success('Saved to Downloads');
  } catch {
    try {
      await Filesystem.writeFile({ path: filename, data: base64, directory: Directory.Documents, recursive: true });
      toast.success('Saved to Documents');
    } catch { toast.error('Could not save file'); }
  }
}

export async function shareFile(uri: string, filename: string) {
  await Share.share({ title: filename, url: uri, dialogTitle: 'Share File' });
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res((r.result as string).split(',')[1]);
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
}

export async function resolveImages(d: import('./types').CaseExportData): Promise<import('./types').CaseExportData> {
  return d; // images stored as base64 dataURLs directly in Dexie
}
