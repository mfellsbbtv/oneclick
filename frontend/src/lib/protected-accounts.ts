// These accounts can NEVER be terminated through the app.
// Changing this list requires a code change + redeploy.
const HARDCODED_PROTECTED: readonly string[] = Object.freeze([
  'mfells@broadbandtvcorp.com',
  'mfells@rhei.com',
  // Add other critical accounts as needed
]);

export function getProtectedAccounts(): Set<string> {
  const envProtected = (process.env.PROTECTED_ACCOUNTS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  return new Set([...HARDCODED_PROTECTED.map(e => e.toLowerCase()), ...envProtected]);
}

export function isProtected(email: string): boolean {
  return getProtectedAccounts().has(email.toLowerCase());
}
