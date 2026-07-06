// Web / non-native — social sign-in is native-only for now.
export function isAppleAuthAvailable() { return false; }
export function isGoogleAuthAvailable() { return false; }
export async function signInWithApple() { throw new Error('not_available'); }
export async function signInWithGoogle() { throw new Error('not_available'); }
export async function initSocialAuth() {}
