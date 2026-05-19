import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { AppProvider } from './src/context/AppContext';
import AppNavigator from './src/navigation/AppNavigator';
import { BetaRibbon } from './src/components/ui';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppProvider>
          <View style={{ flex: 1 }}>
            <AppNavigator />
            <BetaRibbon top={52} />
          </View>
        </AppProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
