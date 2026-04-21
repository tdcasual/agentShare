import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { I18nProvider, resolveClientLocalePreference, useI18n } from './i18n-provider';

function LocaleProbe() {
  const { locale, t } = useI18n();

  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="retry-label">{t('common.retry')}</span>
    </div>
  );
}

describe('I18nProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    document.cookie = 'app-locale=; Max-Age=0; path=/';
    document.documentElement.lang = '';
  });

  afterEach(() => {
    localStorage.clear();
    document.cookie = 'app-locale=; Max-Age=0; path=/';
    document.documentElement.lang = '';
  });

  it('uses the server-provided locale on first render instead of stale localStorage', () => {
    localStorage.setItem('app-locale', 'zh-CN');

    render(
      <I18nProvider initialLocale="en">
        <LocaleProbe />
      </I18nProvider>
    );

    expect(screen.getByTestId('locale')).toHaveTextContent('en');
    expect(screen.getByTestId('retry-label')).toHaveTextContent('Retry');
  });

  it('restores the saved locale when the locale cookie is missing', () => {
    expect(resolveClientLocalePreference('zh-CN', null, 'en')).toBe('en');
    expect(resolveClientLocalePreference('en', 'en', 'zh-CN')).toBe('en');
  });
});
