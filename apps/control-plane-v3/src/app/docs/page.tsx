import type { Metadata } from 'next';
import { DocsContent } from './docs-content';

export const metadata: Metadata = {
  title: 'Documentation - VaultGate',
  description: 'VaultGate API documentation and quick start guide.',
};

export default function DocsPage() {
  return <DocsContent />;
}
