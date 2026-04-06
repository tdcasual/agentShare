/**
 * Spaces List Component - 空间列表
 */

import { Plus } from 'lucide-react';
import { Badge } from '@/shared/ui-primitives/badge';
import { Button } from '@/shared/ui-primitives/button';
import { Card } from '@/shared/ui-primitives/card';
import { MemberManager } from '@/domains/space/components/member-manager';
import { SectionNotice } from './components';
import type { Space } from '@/domains/space';

export interface SpacesListProps {
  spaces: Space[];
  isLoading: boolean;
  activeSpaceId: string | null;
  isAdding: boolean;
  canManageSpaces: boolean;
  onShowCreateModal: () => void;
  onAddMember: (
    spaceId: string,
    input: { memberType: 'agent' | 'human'; memberId: string; role: string }
  ) => void;
  setActiveSpaceId: (id: string) => void;
}

export function SpacesList({
  spaces,
  isLoading,
  activeSpaceId,
  isAdding,
  canManageSpaces,
  onShowCreateModal,
  onAddMember,
  setActiveSpaceId,
}: SpacesListProps) {
  return (
    <Card className="space-y-5 border border-pink-100 bg-white/90 dark:border-[#3D3D5C] dark:bg-[#252540]/90">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-[#E8E8EC]">
            Persisted spaces
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-[#9CA3AF]">
            API-backed operational containers with explicit members and timeline history.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canManageSpaces ? (
            <Button
              variant="kawaii"
              size="sm"
              onClick={onShowCreateModal}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              创建空间
            </Button>
          ) : null}
          <Badge variant="info">{spaces.length}</Badge>
        </div>
      </div>

      {isLoading && spaces.length === 0 ? (
        <SectionNotice message="Loading persisted spaces..." />
      ) : spaces.length === 0 ? (
        <SectionNotice message="No persisted spaces are available yet." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {spaces.map((space) => (
            <div
              key={space.id}
              role="group"
              aria-label={`${space.name} space`}
              className="rounded-2xl border border-pink-100 bg-pink-50/40 p-4 dark:border-[#3D3D5C] dark:bg-[#1E1E32]/60"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 dark:text-[#E8E8EC]">{space.name}</p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-[#9CA3AF]">{space.summary}</p>
                </div>
                <Badge variant="secondary">{space.status}</Badge>
              </div>

              <div className="mt-3">
                <MemberManager
                  members={space.members}
                  canManage={canManageSpaces}
                  onAddMember={async (input) => {
                    setActiveSpaceId(space.id);
                    setTimeout(async () => {
                      await onAddMember(space.id, input);
                    }, 0);
                  }}
                  isAdding={isAdding && activeSpaceId === space.id}
                />
              </div>

              <div className="mt-3 space-y-2">
                {space.timeline.slice(0, 2).map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-xl border border-white/70 bg-white/70 px-3 py-2 dark:border-[#3D3D5C] dark:bg-[#252540]/80"
                  >
                    <p className="text-sm font-medium text-gray-900 dark:text-[#E8E8EC]">
                      {entry.summary}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-[#9CA3AF]">
                      {entry.entry_type.replaceAll('_', ' ')}
                    </p>
                  </div>
                ))}
                {space.timeline.length === 0 ? (
                  <SectionNotice message="No timeline entries yet." />
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
