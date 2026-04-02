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
