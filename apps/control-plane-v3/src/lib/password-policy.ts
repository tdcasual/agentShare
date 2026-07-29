export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_UTF8_BYTES = 72;

export type PasswordPolicyViolation = 'tooLong' | 'tooWeak';

export function checkPasswordPolicy(password: string): PasswordPolicyViolation | null {
  if (new TextEncoder().encode(password).length > MAX_PASSWORD_UTF8_BYTES) {
    return 'tooLong';
  }
  const meetsPolicy =
    password.length >= MIN_PASSWORD_LENGTH &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password);
  return meetsPolicy ? null : 'tooWeak';
}
