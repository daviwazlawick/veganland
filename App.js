import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { PlusJakartaSans_500Medium, PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans';
import { SpaceMono_400Regular, SpaceMono_700Bold } from '@expo-google-fonts/space-mono';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AppProvider, useApp } from './src/context/AppContext';
import { ReferralProvider, useReferral } from './src/context/ReferralContext';
import { NutritionProvider } from './src/context/NutritionContext';
import AppNavigator, { navigationRef } from './src/navigation/AppNavigator';
import usePushNotifications from './src/hooks/usePushNotifications';
import ForceUpdateScreen from './src/screens/ForceUpdateScreen';
import PendingReferralPrompt from './src/components/PendingReferralPrompt';
import Brand from './src/brand';
import useForceUpdate from './src/hooks/useForceUpdate';
import { initPurchases } from './src/services/purchasesService';
import { initAnalytics } from './src/services/analyticsService';
import { bootAttribution, captureUtmFromUrl } from './src/services/attributionService';

// expo-linking has a native module — guard so OTAs stay safe on native
// builds that don't have it linked yet (see attributionService.js).
let Linking = null;
try { Linking = require('expo-linking'); } catch {}

initPurchases();
initAnalytics();
bootAttribution();
// Keep listening: a link opened while the app is warm should still stamp
// utm_* onto storage so a subsequent register call carries the campaign.
try { Linking?.addEventListener('url', ({ url }) => captureUtmFromUrl(url)); } catch {}

const BRAND_FONTS = Brand.fonts
  ? { Manrope_700Bold, Manrope_800ExtraBold, PlusJakartaSans_500Medium, PlusJakartaSans_700Bold, SpaceMono_400Regular, SpaceMono_700Bold }
  : {};

function AppContent() {
  const updateState = useForceUpdate();
  const { token } = useAuth();
  const { disclaimerAccepted } = useApp();
  const { scanClipboard } = useReferral();

  useEffect(() => {
    // Scan clipboard on cold start so first-time users who tapped a
    // referral link and installed the app see their code auto-filled on
    // the register screen. Also re-scan after login+disclaimer for the
    // pending-code modal.
    scanClipboard();
  }, [scanClipboard]);

  useEffect(() => {
    if (token && disclaimerAccepted) {
      scanClipboard();
    }
  }, [token, disclaimerAccepted, scanClipboard]);

  usePushNotifications(navigationRef);

  if (updateState?.required) {
    return <ForceUpdateScreen storeUrl={updateState.storeUrl} />;
  }

  return (
    <View style={{ flex: 1 }}>
      <AppNavigator />
      <PendingReferralPrompt />
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts(BRAND_FONTS);
  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppProvider>
          <ReferralProvider>
            <NutritionProvider>
              <AppContent />
            </NutritionProvider>
          </ReferralProvider>
        </AppProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
