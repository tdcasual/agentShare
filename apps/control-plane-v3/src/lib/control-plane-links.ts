import {
  LayoutDashboard,
  Inbox,
  BookOpen,
  PlayCircle,
  Users,
  Package,
  Globe,
  CheckSquare,
  Gavel,
  ShieldCheck,
  Sparkles,
  KeyRound,
  Settings,
} from 'lucide-react';
import { hasRequiredRole, type ManagementRole } from '@/lib/role-system';
import type { LucideIcon } from 'lucide-react';

type IdentityLinkTarget =
  | { agentId: string; adminId?: never }
  | { adminId: string; agentId?: never };

type EventLinkInput = {
  actionUrl?: string | null;
  subjectType: string;
  subjectId: string;
  metadata?: Record<string, unknown> | null;
};

const GENERIC_MANAGEMENT_ROUTES = new Set([
  '/assets',
  '/identities',
  '/inbox',
  '/marketplace',
  '/reviews',
  '/spaces',
  '/tasks',
]);

function withQuery(path: string, params: Record<string, string | undefined>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      searchParams.set(key, value);
    }
  }

  const query = searchParams.toString();
  return query ? `${path}?${query}` : path;
}

function getMetadataString(metadata: Record<string, unknown> | null | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function isGenericManagementHref(href: string) {
  if (!href.startsWith('/')) {
    return false;
  }

  const [path] = href.split('?');
  return GENERIC_MANAGEMENT_ROUTES.has(path);
}

export function buildIdentityHref(target: IdentityLinkTarget) {
  if ('agentId' in target) {
    return withQuery('/identities', { agentId: target.agentId });
  }

  return withQuery('/identities', { adminId: target.adminId });
}

export function buildTaskHref(taskId?: string) {
  return withQuery('/tasks', { taskId });
}

export function buildAssetHref(resourceKind: string, resourceId: string) {
  return withQuery('/assets', { resourceKind, resourceId });
}

export function buildReviewHref(resourceKind: string, resourceId: string) {
  return withQuery('/reviews', { resourceKind, resourceId });
}

export function buildSpaceHref({ agentId, eventId }: { agentId?: string; eventId?: string }) {
  return withQuery('/spaces', { agentId, eventId });
}

export function deriveEventHref({ actionUrl, subjectType, subjectId, metadata }: EventLinkInput) {
  const explicitAction = actionUrl ?? undefined;
  const derivedTaskId = getMetadataString(metadata, 'task_id');
  const derivedResourceKind = getMetadataString(metadata, 'resource_kind');
  const derivedResourceId = getMetadataString(metadata, 'resource_id');

  if (explicitAction && !isGenericManagementHref(explicitAction)) {
    return explicitAction;
  }

  switch (subjectType) {
    case 'task':
      return buildTaskHref(subjectId);
    case 'task_target':
      return buildTaskHref(derivedTaskId);
    case 'secret':
    case 'capability':
      return buildAssetHref(subjectType, subjectId);
    case 'agent':
      return buildIdentityHref({ agentId: subjectId });
    case 'admin_account':
    case 'human':
      return buildIdentityHref({ adminId: subjectId });
    case 'review':
      if (derivedResourceKind && derivedResourceId) {
        return buildReviewHref(derivedResourceKind, derivedResourceId);
      }
      break;
    case 'space':
      return buildSpaceHref({ eventId: subjectId });
    default:
      break;
  }

  return explicitAction ?? '/inbox';
}

// ============================================
// Centralized Shell Navigation Schema
// ============================================

export interface ShellNavItem {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  requiredRole: ManagementRole;
  settings?: boolean;
}

export const SHELL_NAV_ITEMS: ShellNavItem[] = [
  { href: '/', labelKey: 'navigation.hub', icon: LayoutDashboard, requiredRole: 'admin' },
  { href: '/inbox', labelKey: 'navigation.inbox', icon: Inbox, requiredRole: 'admin' },
  { href: '/reviews', labelKey: 'navigation.reviews', icon: ShieldCheck, requiredRole: 'operator' },
  { href: '/approvals', labelKey: 'navigation.approvals', icon: Gavel, requiredRole: 'operator' },
  {
    href: '/marketplace',
    labelKey: 'navigation.marketplace',
    icon: Sparkles,
    requiredRole: 'operator',
  },
  { href: '/playbooks', labelKey: 'navigation.playbooks', icon: BookOpen, requiredRole: 'viewer' },
  { href: '/runs', labelKey: 'navigation.runs', icon: PlayCircle, requiredRole: 'viewer' },
  { href: '/spaces', labelKey: 'navigation.spaces', icon: Globe, requiredRole: 'viewer' },
  { href: '/identities', labelKey: 'navigation.identities', icon: Users, requiredRole: 'admin' },
  { href: '/assets', labelKey: 'navigation.assets', icon: Package, requiredRole: 'admin' },
  { href: '/tokens', labelKey: 'navigation.tokens', icon: KeyRound, requiredRole: 'admin' },
  { href: '/tasks', labelKey: 'navigation.tasks', icon: CheckSquare, requiredRole: 'admin' },
  {
    href: '/settings',
    labelKey: 'navigation.settings',
    icon: Settings,
    requiredRole: 'admin',
    settings: true,
  },
];

export function getVisibleShellNavItems(
  role: ManagementRole | null,
  opts?: { includeSettings?: boolean }
) {
  if (!role) {
    return [];
  }
  const includeSettings = opts?.includeSettings ?? true;
  return SHELL_NAV_ITEMS.filter(
    (item) => hasRequiredRole(role, item.requiredRole) && (includeSettings || !item.settings)
  );
}
