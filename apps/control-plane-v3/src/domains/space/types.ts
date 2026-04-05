export interface SpaceMember {
  id: string;
  member_type: string;
  member_id: string;
  role: string;
  created_at: string;
}

export interface SpaceTimelineEntry {
  id: string;
  entry_type: string;
  subject_type: string;
  subject_id: string;
  summary: string;
  created_at: string;
}

export interface Space {
  id: string;
  name: string;
  summary: string;
  status: string;
  created_by_actor_id: string;
  created_at: string;
  updated_at: string;
  members: SpaceMember[];
  timeline: SpaceTimelineEntry[];
}

export interface SpaceListResponse {
  items: Space[];
}

// ============================================
// 创建空间
// ============================================

export interface CreateSpaceInput {
  name: string;
  summary?: string;
}

export interface SpaceResponse {
  id: string;
  name: string;
  summary: string;
  status: string;
  created_by_actor_id: string;
  created_at: string;
  updated_at: string;
  members: SpaceMember[];
  timeline: SpaceTimelineEntry[];
}

// ============================================
// 成员管理
// ============================================

export interface CreateSpaceMemberInput {
  memberType: 'agent' | 'human';
  memberId: string;
  role: string;
}

export interface SpaceMemberResponse {
  id: string;
  space_id: string;
  member_type: string;
  member_id: string;
  role: string;
  created_at: string;
}
