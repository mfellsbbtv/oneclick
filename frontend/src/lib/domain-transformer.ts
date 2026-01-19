// lib/domain-transformer.ts
/**
 * Transforms email domains for different cloud providers
 * Microsoft 365 requires @bbtv.com domain
 * Google Workspace uses @rhei.com domain
 */

/**
 * Transform @rhei.com email to @bbtv.com for Microsoft 365
 * Example: mshort@rhei.com → mshort@bbtv.com
 */
export function transformEmailForMicrosoft365(email: string): string {
  if (!email) return email;

  // Replace @rhei.com with @bbtv.com
  return email.replace(/@rhei\.com$/i, '@bbtv.com');
}

/**
 * Get the userPrincipalName for Microsoft 365
 * This is what Microsoft uses as the primary identifier
 */
export function getMicrosoft365UserPrincipalName(email: string): string {
  return transformEmailForMicrosoft365(email);
}

/**
 * Get the primary email for Google Workspace
 * Google uses @rhei.com as-is
 */
export function getGoogleWorkspacePrimaryEmail(email: string): string {
  return email; // No transformation needed for Google
}

/**
 * Extract username from email (part before @)
 * Example: mshort@rhei.com → mshort
 */
export function extractUsernameFromEmail(email: string): string {
  return email.split('@')[0];
}

/**
 * Generate display name from first and last name
 */
export function generateDisplayName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}
