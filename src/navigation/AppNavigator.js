import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, ActivityIndicator } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Colors } from '../constants/colors';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import ProfileSetupScreen from '../screens/ProfileSetupScreen';
import HomeScreen from '../screens/HomeScreen';
import ScanScreen from '../screens/ScanScreen';
import ResultScreen from '../screens/ResultScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { t } from '../i18n';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TABS = {
  Home:    { active: '🌿', inactive: '🌿', activeBg: Colors.primaryBg },
  Profile: { active: '🐾', inactive: '🐾', activeBg: Colors.accentLight },
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
      <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.35 }}>{cfg.active}</Text>
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
          backgroundColor: Colors.card,
          borderTopWidth: 2,
          borderTopColor: Colors.border,
          height: 90,
          paddingBottom: 22,
          paddingTop: 10,
          shadowColor: '#000',
          shadowOpacity: 0.06,
          shadowRadius: 10,
          elevation: 8,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '900' },
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

export default function AppNavigator() {
  const { token, isLoaded: authLoaded } = useAuth();
  const { isLoaded: appLoaded, isProfileLoaded, profile } = useApp();

  if (!authLoaded || !appLoaded || (token && !isProfileLoaded)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary }}>
        <ActivityIndicator color={Colors.white} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!token ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
          </>
        ) : !profile ? (
          <>
            <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="Scan"
              component={ScanScreen}
              options={{ presentation: 'fullScreenModal' }}
            />
            <Stack.Screen name="Result" component={ResultScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="Scan"
              component={ScanScreen}
              options={{ presentation: 'fullScreenModal' }}
            />
            <Stack.Screen name="Result" component={ResultScreen} />
            <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
