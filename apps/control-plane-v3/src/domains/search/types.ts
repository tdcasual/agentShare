export interface SearchResultItem {
  id: string;
  kind: string;
  title: string;
  subtitle: string;
  href: string;
}

export interface GroupedSearchResults {
  identities: SearchResultItem[];
  tasks: SearchResultItem[];
  assets: SearchResultItem[];
  skills: SearchResultItem[];
  events: SearchResultItem[];
}
