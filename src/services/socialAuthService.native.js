import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';

let googleConfigured = false;

export function isAppleAuthAvailable() {
  return Platform.OS === 'ios';
}

export function isGoogleAuthAvailable() {
  return !!GOOGLE_WEB_CLIENT_ID;
}

export async function initSocialAuth() {
  if (!GOOGLE_WEB_CLIENT_ID || googleConfigured) return;
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
    offlineAccess: false,
  });
  googleConfigured = true;
}

// Returns { idToken, email } — caller sends idToken to /auth/google. Throws
// with err.userCancelled = true when the user dismisses the sheet, so screens
// can silently ignore that case.
export async function signInWithGoogle() {
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
    if (e?.code === statusCodes.SIGN_IN_CANCELLED || e?.code === statusCodes.IN_PROGRESS) {
      const cancel = new Error('cancelled');
      cancel.userCancelled = true;
      throw cancel;
    }
    throw e;
  }
}

// Returns { identityToken, email, fullName } — Apple only returns email/name
// on the FIRST sign-in for a given user. We forward them so the backend can
// create the account on that pass. Subsequent sign-ins just get the sub.
export async function signInWithApple() {
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
