import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LanguageSwitcher } from './language-switcher';

describe('LanguageSwitcher', () => {
  it('labels the compact trigger for assistive technology', () => {
    render(<LanguageSwitcher compact />);

    expect(screen.getByRole('button')).toHaveTextContent(/common\.switchLanguage/);
  });

  it('labels the full trigger for assistive technology', () => {
    render(<LanguageSwitcher />);

    expect(screen.getByRole('button')).toHaveTextContent(/common\.switchLanguage/);
  });
});
