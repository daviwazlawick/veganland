import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Syne_700Bold, Syne_800ExtraBold } from '@expo-google-fonts/syne';
import { PlusJakartaSans_500Medium, PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans';
import { AuthProvider } from './src/context/AuthContext';
import { AppProvider } from './src/context/AppContext';
import AppNavigator from './src/navigation/AppNavigator';
import ForceUpdateScreen from './src/screens/ForceUpdateScreen';
import Brand from './src/brand';
import useForceUpdate from './src/hooks/useForceUpdate';
import { initPurchases } from './src/services/purchasesService';

initPurchases();

const BRAND_FONTS = Brand.fonts
  ? { Syne_700Bold, Syne_800ExtraBold, PlusJakartaSans_500Medium, PlusJakartaSans_700Bold }
  : {};

function AppContent() {
  const updateState = useForceUpdate();

  if (updateState?.required) {
    return <ForceUpdateScreen storeUrl={updateState.storeUrl} />;
  }

  return (
    <View style={{ flex: 1 }}>
      <AppNavigator />
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
          <AppContent />
        </AppProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
