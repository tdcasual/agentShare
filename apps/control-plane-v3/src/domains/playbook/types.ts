export interface PlaybookTransportDTO {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly task_type: string;
  readonly tags: string[];
  readonly publication_status: string;
}

export interface Playbook {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly taskType: string;
  readonly tags: string[];
  readonly publicationStatus: string;
}

export interface PlaybookSearchQuery {
  readonly q?: string;
  readonly taskType?: string;
  readonly tag?: string;
}

export interface PlaybookSearchResponse {
  readonly items: PlaybookTransportDTO[];
  readonly meta: {
    readonly total: number;
    readonly items_count: number;
    readonly applied_filters: {
      readonly task_type?: string;
      readonly q?: string;
      readonly tag?: string;
    };
  };
}

export interface CreatePlaybookInput {
  readonly title: string;
  readonly body: string;
  readonly taskType: string;
  readonly tags?: string[];
}
