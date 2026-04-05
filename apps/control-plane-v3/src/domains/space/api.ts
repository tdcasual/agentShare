import { apiFetch } from '@/lib/api-client';
import type { 
  SpaceListResponse, 
  SpaceResponse,
  SpaceMemberResponse,
  CreateSpaceInput,
  CreateSpaceMemberInput 
} from './types';

export function listSpaces(options?: { agentId?: string | null }) {
  const params = new URLSearchParams();
  if (options?.agentId) {
    params.set('agent_id', options.agentId);
  }
  const suffix = params.size > 0 ? `?${params.toString()}` : '';
  return apiFetch<SpaceListResponse>(`/spaces${suffix}`);
}

/**
 * 创建空间
 */
export function createSpace(input: CreateSpaceInput): Promise<SpaceResponse> {
  return apiFetch<SpaceResponse>('/spaces', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: input.name,
      summary: input.summary || '',
    }),
  });
}

/**
 * 获取空间详情
 */
export function getSpace(spaceId: string): Promise<SpaceResponse> {
  return apiFetch<SpaceResponse>(`/spaces/${spaceId}`);
}

/**
 * 添加成员到空间
 */
export function addSpaceMember(
  spaceId: string, 
  input: CreateSpaceMemberInput
): Promise<SpaceMemberResponse> {
  return apiFetch<SpaceMemberResponse>(`/spaces/${spaceId}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      member_type: input.memberType,
      member_id: input.memberId,
      role: input.role,
    }),
  });
}

export const spaceApi = {
  listSpaces,
  createSpace,
  getSpace,
  addSpaceMember,
};
