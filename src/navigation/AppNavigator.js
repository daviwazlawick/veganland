import React from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { font } from '../theme/type';

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
import BodyProfileScreen from '../screens/BodyProfileScreen';
import BodyAnalysisScreen from '../screens/BodyAnalysisScreen';
import VideoAnalysisScreen from '../screens/VideoAnalysisScreen';
import ReportProductScreen from '../screens/ReportProductScreen';
import NutritionGoalsScreen from '../screens/NutritionGoalsScreen';
import NutritionDashboardScreen from '../screens/NutritionDashboardScreen';
import PlateAnalysisScreen from '../screens/PlateAnalysisScreen';
import ExerciseLogScreen from '../screens/ExerciseLogScreen';
import HistoryScreen from '../screens/HistoryScreen';
import { t } from '../i18n';
import { PremiumIcon } from '../components/ui';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
export const navigationRef = createNavigationContainerRef();

const TABS = {
  Home:    { icon: 'home' },
  Diary:   { icon: 'restaurant' },
  History: { icon: 'time' },
  Profile: { icon: 'person' },
};

function TabIcon({ name, focused }) {
  const base = TABS[name].icon;
  return (
    <Ionicons
      name={focused ? base : `${base}-outline`}
      size={23}
      color={focused ? Colors.text : Colors.textMuted}
    />
  );
}

// Aba do meio: não é tela, é o atalho fixo pro Scan (a ação principal do app).
function ScanTabButton({ onPress, label }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={{
          width: 56, height: 44, borderRadius: 14,
          backgroundColor: Colors.forest || Colors.primaryDark,
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Ionicons name="scan-outline" size={24} color={Colors.white} />
      </TouchableOpacity>
    </View>
  );
}

function EmptyTab() { return null; }

function MainTabs() {
  const { language } = useApp();
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: Colors.text,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.card,
          borderTopWidth: 1,
          borderTopColor: Colors.rule || Colors.border,
          height: 68 + insets.bottom,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 8),
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: { fontSize: 11, ...font('bodyBold') },
        tabBarIcon: ({ focused }) => TABS[route.name] ? <TabIcon name={route.name} focused={focused} /> : null,
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: t(language, 'home.tab_home') }}
      />
      <Tab.Screen
        name="Diary"
        component={NutritionDashboardScreen}
        options={{ tabBarLabel: t(language, 'home.tab_diary') }}
      />
      <Tab.Screen
        name="ScanTab"
        component={EmptyTab}
        listeners={({ navigation }) => ({
          tabPress: (e) => { e.preventDefault(); navigation.navigate('Scan'); },
        })}
        options={{
          tabBarLabel: () => null,
          tabBarButton: (props) => (
            <ScanTabButton onPress={props.onPress} label={t(language, 'nutrition.plate_scan_btn')} />
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{ tabBarLabel: t(language, 'home.tab_history') }}
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
    !token ? (hasLaunchedBefore ? 'Login' : 'Welcome') :
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
            <Stack.Screen name="BodyProfile" component={BodyProfileScreen} />
            <Stack.Screen name="BodyAnalysis" component={BodyAnalysisScreen} />
            <Stack.Screen name="VideoAnalysis" component={VideoAnalysisScreen} />
            <Stack.Screen name="NutritionGoals" component={NutritionGoalsScreen} />
            <Stack.Screen name="NutritionDashboard" component={NutritionDashboardScreen} />
            <Stack.Screen name="PlateAnalysis" component={PlateAnalysisScreen} />
            <Stack.Screen name="ExerciseLog" component={ExerciseLogScreen} />
            <Stack.Screen name="ReportProduct" component={ReportProductScreen} />
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
            <Stack.Screen name="BodyProfile" component={BodyProfileScreen} />
            <Stack.Screen name="BodyAnalysis" component={BodyAnalysisScreen} />
            <Stack.Screen name="VideoAnalysis" component={VideoAnalysisScreen} />
            <Stack.Screen name="NutritionGoals" component={NutritionGoalsScreen} />
            <Stack.Screen name="NutritionDashboard" component={NutritionDashboardScreen} />
            <Stack.Screen name="PlateAnalysis" component={PlateAnalysisScreen} />
            <Stack.Screen name="ExerciseLog" component={ExerciseLogScreen} />
            <Stack.Screen name="ReportProduct" component={ReportProductScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
