'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { useI18n } from '@/components/i18n-provider';
import { SettingsNavigation } from '@/components/settings-navigation';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { InlineAlert } from '@/components/ui/inline-alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { checkPasswordPolicy } from '@/lib/password-policy';
import { ApiError, changePassword } from '@/lib/vaultgate-api';

const PASSWORD_CHANGED_NOTICE_KEY = 'vaultgate-password-changed';

type PasswordField = 'currentPassword' | 'newPassword' | 'confirmPassword';

export default function SecuritySettingsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [visible, setVisible] = useState<Record<PasswordField, boolean>>({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<PasswordField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function setValue(field: PasswordField, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setFormError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});
    setFormError(null);

    const requiredErrors: Partial<Record<PasswordField, string>> = {};
    if (!form.currentPassword) {
      requiredErrors.currentPassword = t('settings.security.required');
    }
    if (!form.newPassword) {
      requiredErrors.newPassword = t('settings.security.required');
    }
    if (!form.confirmPassword) {
      requiredErrors.confirmPassword = t('settings.security.required');
    }
    if (Object.keys(requiredErrors).length > 0) {
      setFieldErrors(requiredErrors);
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setFieldErrors({ confirmPassword: t('settings.security.passwordMismatch') });
      return;
    }

    const policyViolation = checkPasswordPolicy(form.newPassword);
    if (policyViolation) {
      setFieldErrors({
        newPassword: t(
          policyViolation === 'tooLong'
            ? 'settings.security.passwordTooLong'
            : 'settings.security.passwordTooWeak'
        ),
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await changePassword({
        current_password: form.currentPassword,
        new_password: form.newPassword,
      });
      try {
        window.sessionStorage.setItem(PASSWORD_CHANGED_NOTICE_KEY, '1');
      } catch {
        // Storage may be disabled; the security-critical redirect must still happen.
      }
      router.replace('/login');
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        setFieldErrors({ currentPassword: t('settings.security.currentPasswordIncorrect') });
      } else if (error instanceof ApiError && error.status === 409) {
        setFieldErrors({ newPassword: t('settings.security.passwordReuse') });
      } else if (error instanceof ApiError && error.status === 422) {
        setFieldErrors({ newPassword: t('settings.security.passwordRejected') });
      } else if (error instanceof ApiError && error.status === 0) {
        setFormError(t('common.networkError'));
      } else {
        setFormError(t('common.serverError'));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main id="main-content" className="mx-auto w-full max-w-screen-2xl space-y-5 p-4 sm:p-6 lg:p-8">
      <SettingsNavigation />
      <header className="border-b pb-4">
        <h1 className="text-xl font-semibold text-foreground">{t('settings.security.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('settings.security.description')}</p>
      </header>

      <section className="max-w-xl space-y-5" aria-labelledby="password-heading">
        <div>
          <h2 id="password-heading" className="text-base font-semibold text-foreground">
            {t('settings.security.changePassword')}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('settings.security.passwordHint')}
          </p>
        </div>

        <Callout variant="warning" icon={<KeyRound className="h-5 w-5" aria-hidden="true" />}>
          {t('settings.security.sessionWarning')}
        </Callout>

        <form className="space-y-4 border-y py-5" onSubmit={handleSubmit} noValidate>
          <PasswordInput
            id="current-password"
            label={t('settings.security.currentPassword')}
            autoComplete="current-password"
            value={form.currentPassword}
            visible={visible.currentPassword}
            error={fieldErrors.currentPassword}
            disabled={isSubmitting}
            onChange={(value) => setValue('currentPassword', value)}
            onToggle={() =>
              setVisible((current) => ({ ...current, currentPassword: !current.currentPassword }))
            }
            showLabel={t('settings.security.showPassword')}
            hideLabel={t('settings.security.hidePassword')}
          />
          <PasswordInput
            id="new-password"
            label={t('settings.security.newPassword')}
            autoComplete="new-password"
            value={form.newPassword}
            visible={visible.newPassword}
            error={fieldErrors.newPassword}
            disabled={isSubmitting}
            onChange={(value) => setValue('newPassword', value)}
            onToggle={() =>
              setVisible((current) => ({ ...current, newPassword: !current.newPassword }))
            }
            showLabel={t('settings.security.showPassword')}
            hideLabel={t('settings.security.hidePassword')}
          />
          <PasswordInput
            id="confirm-password"
            label={t('settings.security.confirmPassword')}
            autoComplete="new-password"
            value={form.confirmPassword}
            visible={visible.confirmPassword}
            error={fieldErrors.confirmPassword}
            disabled={isSubmitting}
            onChange={(value) => setValue('confirmPassword', value)}
            onToggle={() =>
              setVisible((current) => ({ ...current, confirmPassword: !current.confirmPassword }))
            }
            showLabel={t('settings.security.showPassword')}
            hideLabel={t('settings.security.hidePassword')}
          />

          {formError && <InlineAlert>{formError}</InlineAlert>}
          <Button type="submit" loading={isSubmitting} leftIcon={<KeyRound />}>
            {t('settings.security.submit')}
          </Button>
        </form>
      </section>
    </main>
  );
}

function PasswordInput({
  id,
  label,
  autoComplete,
  value,
  visible,
  error,
  disabled,
  onChange,
  onToggle,
  showLabel,
  hideLabel,
}: {
  id: string;
  label: string;
  autoComplete: string;
  value: string;
  visible: boolean;
  error?: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onToggle: () => void;
  showLabel: string;
  hideLabel: string;
}) {
  const errorId = `${id}-error`;
  const toggleLabel = visible ? hideLabel : showLabel;
  const VisibilityIcon = visible ? EyeOff : Eye;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="pr-11"
          required
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
        />
        <button
          type="button"
          onClick={onToggle}
          disabled={disabled}
          aria-label={toggleLabel}
          title={toggleLabel}
          className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:opacity-50"
        >
          <VisibilityIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      {error && (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
