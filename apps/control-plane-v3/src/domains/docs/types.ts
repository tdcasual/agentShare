/**
 * Docs Domain Types
 *
 * Public documentation surfaced from /api/public/docs
 */

export interface PublicDocItem {
  readonly category: string;
  readonly filename: string;
  readonly title?: string;
  readonly summary?: string;
}

export interface PublicDocDetail {
  readonly category: string;
  readonly filename: string;
  readonly title?: string;
  readonly content: string;
}
