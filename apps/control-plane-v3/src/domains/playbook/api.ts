import { apiFetch } from '@/lib/api-client';
import type {
  PlaybookTransportDTO,
  PlaybookSearchQuery,
  PlaybookSearchResponse,
  CreatePlaybookInput,
} from './types';

const BASE_URL = '/playbooks';

export type { PlaybookSearchResponse } from './types';

export async function searchPlaybooks(
  query?: PlaybookSearchQuery
): Promise<PlaybookSearchResponse> {
  const params = new URLSearchParams();
  if (query?.q) {
    params.set('q', query.q);
  }
  if (query?.taskType) {
    params.set('task_type', query.taskType);
  }
  if (query?.tag) {
    params.set('tag', query.tag);
  }

  const queryString = params.toString();
  const url = queryString ? `${BASE_URL}/search?${queryString}` : `${BASE_URL}/search`;

  return apiFetch(url);
}

export async function getPlaybook(playbookId: string): Promise<PlaybookTransportDTO> {
  return apiFetch(`${BASE_URL}/${playbookId}`);
}

export async function createPlaybook(input: CreatePlaybookInput): Promise<PlaybookTransportDTO> {
  return apiFetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: input.title,
      body: input.body,
      task_type: input.taskType,
      tags: input.tags || [],
    }),
  });
}

export const playbookApi = {
  searchPlaybooks,
  getPlaybook,
  createPlaybook,
};
