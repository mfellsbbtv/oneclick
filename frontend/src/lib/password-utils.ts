/**
 * Utility functions for password generation and display
 */

export function generatePassword(length: number = 12): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export function isPasswordModeAuto(formData: Record<string, any>): boolean {
  return !formData.passwordMode || formData.passwordMode === 'auto';
}

export function shouldShowGeneratedPassword(formData: Record<string, any>): boolean {
  return isPasswordModeAuto(formData);
}