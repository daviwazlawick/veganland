import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';

export async function readUriAsBase64(uri) {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
}

// Cross-platform document picker — uses native <input type="file"> on web
// (more reliable than expo-document-picker on web), DocumentPicker on native.
// Returns { base64, mediaType } or null if cancelled.
export function pickDocumentAsBase64() {
  if (Platform.OS === 'web') {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/pdf,image/*';
      input.onchange = (e) => {
        const file = e.target.files?.[0];
        if (!file) { resolve(null); return; }
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result;
          const comma = result.indexOf(',');
          resolve({ base64: comma >= 0 ? result.slice(comma + 1) : result, mediaType: file.type || 'application/pdf' });
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      };
      // resolve null if picker is dismissed without selection
      window.addEventListener('focus', function onFocus() {
        window.removeEventListener('focus', onFocus);
        setTimeout(() => { if (!input.files?.length) resolve(null); }, 500);
      }, { once: true });
      input.click();
    });
  }

  return DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true })
    .then(async (result) => {
      if (result.canceled || !result.assets?.[0]) return null;
      const asset = result.assets[0];
      const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
      return { base64, mediaType: asset.mimeType || 'application/pdf' };
    });
}
