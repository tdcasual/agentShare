/**
 * Human Operators Section Component
 */

import Link from 'next/link';
import { ChevronDown, ChevronUp, Users } from 'lucide-react';
import { Badge } from '@/shared/ui-primitives/badge';
import { Button } from '@/shared/ui-primitives/button';
import { Card } from '@/shared/ui-primitives/card';
import {
  ManagementSessionRecoveryNotice,
  isForbiddenError,
  isUnauthorizedError,
} from '@/lib/management-session-recovery';
import {
  EmptyState,
  SectionLoading,
  SectionError,
  IdentityDetailsGrid,
  formatOptionalTimestamp,
} from './components';
import type { AdminAccountSummary } from '@/domains/identity';

export interface HumanOperatorsSectionProps {
  accounts: AdminAccountSummary[];
  filteredAccounts: AdminAccountSummary[];
  isLoading: boolean;
  error: Error | null;
  searchQuery: string;
  expandedAccounts: string[];
  shouldShowSessionExpired: boolean;
  shouldShowForbidden?: boolean;
  isRefreshing: boolean;
  focusedAccountId?: string | null;
  onToggleExpand: (accountId: string) => void;
  onRetry: () => Promise<void>;
}

export function HumanOperatorsSection({
  accounts,
  filteredAccounts,
  isLoading,
  error,
  searchQuery,
  expandedAccounts,
  shouldShowSessionExpired,
  shouldShowForbidden,
  isRefreshing,
  focusedAccountId,
  onToggleExpand,
  onRetry,
}: HumanOperatorsSectionProps) {
  const errorMessage = error instanceof Error ? error.message : null;

  return (
    <Card variant="kawaii" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-[#E8E8EC]">
            Human Operators
          </h2>
          <p className="text-sm text-gray-500 dark:text-[#9CA3AF]">
            Persisted admin accounts from `/api/admin-accounts`
          </p>
        </div>
        <Badge variant="human">{accounts.length}</Badge>
      </div>

      {isLoading ? (
        <SectionLoading message="Loading admin accounts..." />
      ) : shouldShowSessionExpired && isUnauthorizedError(error) ? (
        <ManagementSessionRecoveryNotice message="Sign in again to reload human operators." />
      ) : shouldShowForbidden && isForbiddenError(error) ? (
        <ManagementSessionRecoveryNotice message="An admin session is required to manage human operators." />
      ) : errorMessage ? (
        <SectionError
          message={`Human operator data is temporarily unavailable. ${errorMessage}`}
          actionLabel="Retry human operators"
          onRetry={onRetry}
          isRefreshing={isRefreshing}
        />
      ) : accounts.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          message="No admin accounts have been invited yet."
        />
      ) : filteredAccounts.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          message={`No human operators match "${searchQuery.trim()}".`}
        />
      ) : (
        <div className="space-y-3">
          {filteredAccounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              isExpanded={expandedAccounts.includes(account.id)}
              isFocused={account.id === focusedAccountId}
              onToggleExpand={() => onToggleExpand(account.id)}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

interface AccountCardProps {
  account: AdminAccountSummary;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isFocused?: boolean;
}

function AccountCard({ account, isExpanded, onToggleExpand, isFocused }: AccountCardProps) {
  return (
    <div
      data-testid={`admin-card-${account.id}`}
      data-focus-state={isFocused ? 'focused' : 'default'}
      className={`rounded-2xl border bg-white/90 p-4 dark:bg-[#252540]/90 ${
        isFocused
          ? 'border-pink-400 shadow-[0_0_0_1px_rgba(236,72,153,0.18)] dark:border-pink-400'
          : 'border-pink-100 dark:border-[#3D3D5C]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-gray-800 dark:text-[#E8E8EC]">{account.display_name}</p>
          <p className="break-all text-sm text-gray-500 dark:text-[#9CA3AF]">{account.email}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Badge variant="human">{account.role}</Badge>
          <Badge variant={account.status === 'active' ? 'success' : 'warning'}>
            {account.status}
          </Badge>
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          aria-expanded={isExpanded}
          onClick={onToggleExpand}
          rightIcon={
            isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
          }
        >
          {isExpanded
            ? `Hide details for ${account.display_name}`
            : `View details for ${account.display_name}`}
        </Button>
      </div>
      {isExpanded ? (
        <div className="space-y-3">
          <IdentityDetailsGrid
            items={[
              ['Account ID', account.id],
              ['Email', account.email],
              ['Role', account.role],
              ['Last login', formatOptionalTimestamp(account.last_login_at, 'Never signed in')],
            ]}
          />
          <div className="flex justify-end">
            <Link
              href="/settings"
              className="text-sm font-medium text-pink-600 hover:text-pink-700"
            >
              Manage in Settings
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
