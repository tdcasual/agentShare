import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MutationAlert } from './mutation-alert';

describe('MutationAlert', () => {
  it('renders errors as assertive alerts', () => {
    render(<MutationAlert error="Publish failed" success={null} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Publish failed');
  });

  it('renders success as a polite status', () => {
    render(<MutationAlert error={null} success="Published" />);

    expect(screen.getByRole('status')).toHaveTextContent('Published');
  });

  it('renders nothing when there is no feedback', () => {
    const { container } = render(<MutationAlert error={null} success={null} />);

    expect(container).toBeEmptyDOMElement();
  });
});
