export type CatalogResourceKind = 'secret' | 'capability';
export type CatalogReleaseStatus = 'published';

export interface CatalogItem {
  readonly release_id: string;
  readonly resource_kind: CatalogResourceKind;
  readonly resource_id: string;
  readonly title: string;
  readonly subtitle?: string | null;
  readonly version: number;
  readonly release_status: CatalogReleaseStatus | string;
  readonly released_at: string;
  readonly created_by_actor_id: string;
  readonly created_via_token_id?: string | null;
  readonly adoption_count: number;
  readonly release_notes?: string | null;
  readonly prior_versions: number;
}

export interface CatalogReleaseHistory {
  readonly current_release: CatalogItem;
  readonly prior_releases: CatalogItem[];
}
