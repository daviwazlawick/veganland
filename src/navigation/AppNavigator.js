import React from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, ActivityIndicator } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Colors } from '../constants/colors';
import { BrandFonts } from '../brand';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import ProfileSetupScreen from '../screens/ProfileSetupScreen';
import HomeScreen from '../screens/HomeScreen';
import ScanScreen from '../screens/ScanScreen';
import ResultScreen from '../screens/ResultScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EditPersonalScreen from '../screens/EditPersonalScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import PaywallScreen from '../screens/PaywallScreen';
import DeleteAccountScreen from '../screens/DeleteAccountScreen';
import DisclaimerScreen from '../screens/DisclaimerScreen';
import ReferralScreen from '../screens/ReferralScreen';
import { t } from '../i18n';
import { PremiumIcon } from '../components/ui';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
export const navigationRef = createNavigationContainerRef();

const TABS = {
  Home:    { icon: 'home',    activeBg: Colors.primaryBg },
  Profile: { icon: 'profile', activeBg: Colors.primaryBg },
};

function TabIcon({ name, focused }) {
  const cfg = TABS[name];
  return (
    <View style={{
      width: 52,
      height: 34,
      borderRadius: 17,
      backgroundColor: focused ? cfg.activeBg : 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <PremiumIcon name={cfg.icon} size={26} muted={!focused} />
    </View>
  );
}

function MainTabs() {
  const { language } = useApp();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          position: 'absolute',
          left: 24,
          right: 24,
          bottom: 18,
          backgroundColor: 'rgba(255,255,255,0.97)',
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.65)',
          height: 74,
          paddingBottom: 12,
          paddingTop: 10,
          borderRadius: 999,
          shadowColor: Colors.navy,
          shadowOpacity: 0.12,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 12 },
          elevation: 12,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '800', fontFamily: BrandFonts.body || undefined },
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: t(language, 'home.tab_home') }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: t(language, 'home.tab_profile') }}
      />
    </Tab.Navigator>
  );
}

const linking = {
  prefixes: [],
  config: {
    screens: {
      Login: '',
      Register: '',
      Welcome: '',
      ForgotPassword: '',
      Disclaimer: '',
      ProfileSetup: '',
      Main: '',
      Scan: '',
      Result: '',
      EditPersonal: '',
      Paywall: '',
      DeleteAccount: 'delete',
    },
  },
};

export default function AppNavigator() {
  const { token, user, hasLaunchedBefore, isLoaded: authLoaded } = useAuth();
  const { isLoaded: appLoaded, isProfileLoaded, profile, disclaimerAccepted } = useApp();

  // Users whose user_type is explicitly null (post-lock signups who haven't
  // picked a plan yet) are routed away from Main. If they still have their
  // one free onboarding scan available, we send them through the guided
  // Scan flow first; otherwise straight to the paywall.
  // Legacy users (any tier, including 'free') and paid users go to Main.
  // Cached sessions from before this change have user_type absent (undefined)
  // and are treated as legacy — they are NOT forced into the paywall.
  const nullTier = user?.user_type === null;
  const onboardingScanAvailable = nullTier && user?.onboarding_scan_used !== true;
  const profileInitialRoute = onboardingScanAvailable
    ? 'Scan'
    : nullTier ? 'Paywall' : 'Main';

  if (!authLoaded || !appLoaded || (token && !isProfileLoaded)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary }}>
        <ActivityIndicator color={Colors.white} size="large" />
      </View>
    );
  }

  const initialRouteName =
    !token ? (hasLaunchedBefore ? 'Login' : 'Register') :
    !disclaimerAccepted ? 'Disclaimer' :
    !profile ? 'ProfileSetup' :
    profileInitialRoute;

  return (
    <NavigationContainer ref={navigationRef} linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRouteName}>
        {!token ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </>
        ) : !disclaimerAccepted ? (
          <>
            <Stack.Screen name="Disclaimer" component={DisclaimerScreen} />
          </>
        ) : !profile ? (
          <>
            <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="Scan" component={ScanScreen} options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="Result" component={ResultScreen} />
            <Stack.Screen name="EditPersonal" component={EditPersonalScreen} />
            <Stack.Screen name="Paywall" component={PaywallScreen} />
            <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} />
            <Stack.Screen name="Referral" component={ReferralScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="Scan"
              component={ScanScreen}
              options={{ presentation: 'fullScreenModal' }}
              initialParams={onboardingScanAvailable ? { onboarding: true } : undefined}
            />
            <Stack.Screen name="Result" component={ResultScreen} />
            <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
            <Stack.Screen name="EditPersonal" component={EditPersonalScreen} />
            <Stack.Screen name="Paywall" component={PaywallScreen} initialParams={{ currentPlan: 'free' }} />
            <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} />
            <Stack.Screen name="Referral" component={ReferralScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
