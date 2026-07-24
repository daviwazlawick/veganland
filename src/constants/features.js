const brand = process.env.EXPO_PUBLIC_BRAND || 'veganland';
const isNovaQI = brand === 'novaqi';

// NovaQI is subscription-only (no free tier surfaced in onboarding).
// VeganLand launches as freemium and shows the free option.
export const HIDE_FREE_OPTION = isNovaQI;

// Hide the refer-a-friend UI everywhere until the user base is big enough
// that referrals actually produce useful signal. Kept hidden in both brands
// for now — flip to false to re-enable all entry points.
export const HIDE_REFERRAL = true;
