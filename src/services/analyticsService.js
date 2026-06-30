// Web / unavailable platform — all no-ops
export function isAnalyticsConfigured() { return false; }
export async function initAnalytics() {}
export async function requestTrackingPermission() { return 'unavailable'; }
export function logRegistration() {}
export function logStartTrial() {}
export function logSubscribe() {}
export function logScan() {}
export function logInviteShared() {}
export function logReferralQualified() {}
export function logEvent() {}
