/**
 * Docs Domain API
 *
 * Public documentation endpoints (no auth required)
 */

import { apiFetch } from '@/lib/api-client';
import type { PublicDocItem, PublicDocDetail } from './types';

export function listPublicDocs() {
  return apiFetch<{
    categories: string[];
    files: Array<{ category: string; name: string; title?: string }>;
  }>('/public/docs').then(({ files }) => ({
    items: files.map<PublicDocItem>((file) => ({
      category: file.category,
      filename: file.name,
      title: file.title,
    })),
  }));
}

export function getPublicDoc(category: string, filename: string) {
  return apiFetch<{
    category: string;
    name: string;
    title?: string;
    content: string;
  }>(`/public/docs/${category}/${filename}`).then<PublicDocDetail>((doc) => ({
    category: doc.category,
    filename: doc.name,
    title: doc.title,
    content: doc.content,
  }));
}

export const docsApi = {
  listPublicDocs,
  getPublicDoc,
};
