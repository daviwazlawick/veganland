import { Platform, NativeModules, UIManager } from 'react-native';

// Guard native module resolution so this bundle can run on older runtimes
// (e.g. 1.0.12) that don't have expo-apple-authentication or
// @react-native-google-signin/google-signin baked in yet. Metro bundles
// the JS regardless — the require() succeeds even when the native side
// isn't linked, so we ALSO probe UIManager/NativeModules to confirm the
// native code is actually available before advertising availability.
let AppleAuthentication = null;
let GoogleSignin = null;
let statusCodes = null;

try {
  AppleAuthentication = require('expo-apple-authentication');
} catch { /* not installed in this native build */ }

try {
  const g = require('@react-native-google-signin/google-signin');
  GoogleSignin = g.GoogleSignin;
  statusCodes = g.statusCodes;
} catch { /* not installed in this native build */ }

// The Apple button is a native view manager. UIManager.getViewManagerConfig
// is the classic detector, but in New Architecture (Fabric) it returns falsy
// even when the module IS linked — Fabric registers view managers via Codegen
// instead of UIManager. NativeModules.ExpoAppleAuthentication covers that case
// because TurboModules are still visible in NativeModules on New Arch.
const APPLE_NATIVE_LINKED = !!(
  UIManager.getViewManagerConfig?.('ExpoAppleAuthenticationButton') ||
  UIManager.getViewManagerConfig?.('RNCAppleAuthenticationButton') ||
  NativeModules.ExpoAppleAuthentication
);
const GOOGLE_NATIVE_LINKED = !!(
  NativeModules.RNGoogleSignin || NativeModules.RNGoogleSigninCGen
);

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';

let googleConfigured = false;

export function isAppleAuthAvailable() {
  return Platform.OS === 'ios' && APPLE_NATIVE_LINKED && !!AppleAuthentication?.signInAsync;
}

export function isGoogleAuthAvailable() {
  return !!GOOGLE_WEB_CLIENT_ID && GOOGLE_NATIVE_LINKED && !!GoogleSignin;
}

export async function initSocialAuth() {
  if (!GOOGLE_WEB_CLIENT_ID || !GoogleSignin || googleConfigured) return;
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
    offlineAccess: false,
  });
  googleConfigured = true;
}

export async function signInWithGoogle() {
  if (!GoogleSignin) throw new Error('google_not_available');
  if (!GOOGLE_WEB_CLIENT_ID) throw new Error('google_not_configured');
  await initSocialAuth();
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const result = await GoogleSignin.signIn();
    const idToken = result?.data?.idToken || result?.idToken;
    const email = result?.data?.user?.email || result?.user?.email || null;
    if (!idToken) throw new Error('google_no_id_token');
    return { idToken, email };
  } catch (e) {
    if (e?.code === statusCodes?.SIGN_IN_CANCELLED || e?.code === statusCodes?.IN_PROGRESS) {
      const cancel = new Error('cancelled');
      cancel.userCancelled = true;
      throw cancel;
    }
    throw e;
  }
}

export async function signInWithApple() {
  if (!AppleAuthentication?.signInAsync) throw new Error('apple_not_available');
  if (Platform.OS !== 'ios') throw new Error('apple_ios_only');
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    const identityToken = credential.identityToken;
    if (!identityToken) throw new Error('apple_no_identity_token');
    return {
      identityToken,
      email: credential.email || null,
      fullName: credential.fullName || null,
    };
  } catch (e) {
    if (e?.code === 'ERR_REQUEST_CANCELED') {
      const cancel = new Error('cancelled');
      cancel.userCancelled = true;
      throw cancel;
    }
    throw e;
  }
}
