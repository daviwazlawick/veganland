export const HIDE_FREE_OPTION = true;

// Hide the refer-a-friend UI everywhere until the user base is big enough
// that referrals actually produce useful signal. Flip to false to re-enable
// all entry points (Home hero, Result banner, Profile row, pending prompt).
export const HIDE_REFERRAL = true;

// Google Sign-In throws DEVELOPER_ERROR on Android because the Play App
// Signing SHA-1 isn't registered in the Firebase OAuth client. Hide the
// button until the fingerprint is added and a new google-services.json is
// shipped. Flip back to false after the next native build with the fix.
export const HIDE_GOOGLE_SIGNIN = true;
