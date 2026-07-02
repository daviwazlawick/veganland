import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { Platform } from 'react-native';

export const ENTITLEMENT_STARTER = 'starter';
export const ENTITLEMENT_PRO = 'pro';

const RC_KEYS = {
  ios: 'appl_yitutMbhXnSxJFnCqDqkNunlogI',
  android: 'goog_YnmIYLSJyriFzhvfSSnypZCFibv',
};

const RC_API_KEY = RC_KEYS[Platform.OS] || process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || '';

export function isPurchasesAvailable() {
  return !!RC_API_KEY;
}

export async function initPurchases() {
  if (!RC_API_KEY) return;
  if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  Purchases.configure({ apiKey: RC_API_KEY });
}

export async function loginPurchasesUser(userId) {
  if (!RC_API_KEY) return;
  try { await Purchases.logIn(String(userId)); } catch {}
}

export async function logoutPurchasesUser() {
  if (!RC_API_KEY) return;
  try { await Purchases.logOut(); } catch {}
}

export async function fetchCurrentOffering() {
  if (!RC_API_KEY) return null;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch {
    return null;
  }
}

export async function purchasePackage(pkg) {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}

export async function restorePurchases() {
  return Purchases.restorePurchases();
}

export async function getCustomerInfo() {
  if (!RC_API_KEY) return null;
  try { return await Purchases.getCustomerInfo(); } catch { return null; }
}

export function activeEntitlementId(customerInfo) {
  if (!customerInfo?.entitlements?.active) return null;
  if (customerInfo.entitlements.active[ENTITLEMENT_PRO]) return 'pro';
  if (customerInfo.entitlements.active[ENTITLEMENT_STARTER]) return 'starter';
  return null;
}

export function entitlementToUserType(entitlementId) {
  if (entitlementId === 'pro') return 'premium';
  if (entitlementId === 'starter') return 'starter';
  return 'free';
}
