import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Syne_700Bold, Syne_800ExtraBold } from '@expo-google-fonts/syne';
import { PlusJakartaSans_500Medium, PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AppProvider, useApp } from './src/context/AppContext';
import { ReferralProvider, useReferral } from './src/context/ReferralContext';
import AppNavigator, { navigationRef } from './src/navigation/AppNavigator';
import usePushNotifications from './src/hooks/usePushNotifications';
import ForceUpdateScreen from './src/screens/ForceUpdateScreen';
import PendingReferralPrompt from './src/components/PendingReferralPrompt';
import Brand from './src/brand';
import useForceUpdate from './src/hooks/useForceUpdate';
import { initPurchases } from './src/services/purchasesService';
import { initAnalytics } from './src/services/analyticsService';

initPurchases();
initAnalytics();

const BRAND_FONTS = Brand.fonts
  ? { Syne_700Bold, Syne_800ExtraBold, PlusJakartaSans_500Medium, PlusJakartaSans_700Bold }
  : {};

function AppContent() {
  const updateState = useForceUpdate();
  const { token } = useAuth();
  const { disclaimerAccepted } = useApp();
  const { scanClipboard } = useReferral();

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
            <AppContent />
          </ReferralProvider>
        </AppProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
