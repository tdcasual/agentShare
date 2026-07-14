import type { SecretType } from '@/lib/vaultgate-api';

export const SECRET_TYPES: SecretType[] = [
  'password',
  'api_key',
  'basic_auth',
  'bearer_token',
  'api_key_header',
  'oauth_token',
  'certificate',
  'ssh_key',
  'database_url',
  'custom',
];

export function parseTags(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/[，,\n]/)
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  );
}
