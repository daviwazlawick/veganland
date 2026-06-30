// Web / unavailable platform — all no-ops
export async function registerForPushAsync() { return null; }
export function setNotificationHandler() {}
export function addNotificationResponseListener() { return { remove: () => {} }; }
