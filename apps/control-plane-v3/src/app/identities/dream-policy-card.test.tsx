import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DreamPolicyCard } from './dream-policy-card';

describe('DreamPolicyCard', () => {
  it('renders enabled dream mode limits and flags', () => {
    render(
      <DreamPolicyCard
        dreamPolicy={{
          enabled: true,
          max_steps_per_run: 4,
          max_followup_tasks: 1,
          allow_task_proposal: true,
          allow_memory_write: true,
          max_context_tokens: 4096,
        }}
      />
    );

    expect(screen.getByText('Dream Mode')).toBeInTheDocument();
    expect(screen.getByText('identities.values.enabled')).toBeInTheDocument();
    expect(screen.getByText(/4 steps/i)).toBeInTheDocument();
    expect(screen.getByText(/1 follow-up/i)).toBeInTheDocument();
    expect(screen.getByText(/memory write on/i)).toBeInTheDocument();
  });
});
