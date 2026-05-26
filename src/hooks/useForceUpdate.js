import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { apiCheckAppVersion } from '../services/apiService';

function semverGte(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return true;
    if ((pa[i] || 0) < (pb[i] || 0)) return false;
  }
  return true;
}

// Returns { required: bool, storeUrl: string|null } once resolved, null while loading
export default function useForceUpdate() {
  const [state, setState] = useState(null);

  useEffect(() => {
    apiCheckAppVersion().then(data => {
      if (!data) { setState({ required: false, storeUrl: null }); return; }

      const platform = Platform.OS; // 'ios' | 'android' | 'web'
      const platformData = data[platform];
      if (!platformData?.min) { setState({ required: false, storeUrl: null }); return; }

      const current = Constants.expoConfig?.version || '1.0.0';
      const required = !semverGte(current, platformData.min);
      setState({ required, storeUrl: platformData.store_url || null });
    });
  }, []);

  return state;
}
