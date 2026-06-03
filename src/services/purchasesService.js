// Web / unavailable platform — all no-ops
export const ENTITLEMENT_STARTER = 'starter';
export const ENTITLEMENT_PRO = 'pro';

export function isPurchasesAvailable() { return false; }
export async function initPurchases() {}
export async function loginPurchasesUser() {}
export async function logoutPurchasesUser() {}
export async function fetchCurrentOffering() { return null; }
export async function purchasePackage() { throw Object.assign(new Error('not_available'), { userCancelled: false }); }
export async function restorePurchases() { throw Object.assign(new Error('not_available'), { userCancelled: false }); }
export async function getCustomerInfo() { return null; }
export function activeEntitlementId() { return null; }
export function entitlementToUserType() { return 'starter'; }
