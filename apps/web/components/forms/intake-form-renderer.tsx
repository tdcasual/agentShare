"use client";

import { useState, type FormEvent } from "react";

import type { Locale } from "../../lib/i18n-shared";
import {
  buildPreviewPayload,
  getDefaultValues,
  getHydratedValues,
  isFieldVisible,
  localizeCopy,
  stringifyFormValue,
  updateFormValue,
  type FieldSpec,
  type FormValue,
  type IntakeVariantContract,
  type LocalizedCopy,
  type ValidationErrors,
} from "../../lib/forms";
import { IntakePayloadPreview } from "./intake-payload-preview";
import { IntakeTemplateMenu } from "./intake-template-menu";
import { IntakeVariantPicker } from "./intake-variant-picker";

function getContract(
  contracts: IntakeVariantContract[],
  selectedVariant: string,
  defaultVariant: string,
): IntakeVariantContract {
  return contracts.find((contract) => contract.variant === selectedVariant)
    ?? contracts.find((contract) => contract.variant === defaultVariant)
    ?? contracts[0];
}

function joinClassNames(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function IntakeFormRenderer({
  action,
  contracts,
  defaultVariant,
  locale = "en",
  submitLabel,
  variantLabel,
  className,
  advancedSummary = {
    en: "Advanced settings",
    zh: "高级设置",
  },
}: {
  action: (formData: FormData) => void | Promise<void>;
  contracts: IntakeVariantContract[];
  defaultVariant: string;
  locale?: Locale;
  submitLabel: LocalizedCopy;
  variantLabel: LocalizedCopy;
  className?: string;
  advancedSummary?: LocalizedCopy;
}) {
  const initialContract = getContract(contracts, defaultVariant, defaultVariant);
  const [selectedVariant, setSelectedVariant] = useState(initialContract.variant);
  const [values, setValues] = useState(() => getDefaultValues(initialContract));
  const [errors, setErrors] = useState<ValidationErrors>({});

  const currentContract = getContract(contracts, selectedVariant, defaultVariant);
  const hiddenValues = currentContract.serialize(values);
  const previewPayload = buildPreviewPayload(currentContract, values);

  const handleVariantChange = (variant: string) => {
    const previousContract = currentContract;
    const nextContract = getContract(contracts, variant, defaultVariant);
    setSelectedVariant(nextContract.variant);
    setValues((currentValues) => getHydratedValues(nextContract, currentValues, previousContract));
    setErrors({});
  };

  const handleFieldChange = (field: FieldSpec, nextValue: FormValue) => {
    setValues((currentValues) => updateFormValue(currentValues, field.key, nextValue));
    setErrors((currentErrors) => {
      if (!currentErrors[field.key]) {
        return currentErrors;
      }

      const nextErrors = { ...currentErrors };
      delete nextErrors[field.key];
      return nextErrors;
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    const nextErrors = currentContract.validate?.(values, locale) ?? {};
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      event.preventDefault();
    }
  };

  const handleTemplateApply = (templateValues: Record<string, FormValue>) => {
    setValues((currentValues) => getHydratedValues(currentContract, {
      ...currentValues,
      ...templateValues,
    }, currentContract));
    setErrors({});
  };

  const renderField = (field: FieldSpec) => {
    if (!isFieldVisible(field, values)) {
      return null;
    }

    const fieldId = `${currentContract.resourceKind}-${currentContract.variant}-${field.key}`;
    const hintId = field.description ? `${fieldId}-hint` : undefined;
    const errorId = errors[field.key] ? `${fieldId}-error` : undefined;
    const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
    const value = values[field.key];
    const commonProps = {
      id: fieldId,
      "aria-describedby": describedBy,
      "aria-invalid": errors[field.key] ? "true" : "false",
    } as const;
    const fieldClassName = joinClassNames(
      "form-field",
      field.control === "textarea" || field.control === "json" ? "intake-field-full" : undefined,
    );
    const isSelect = field.control === "select";
    const isTextarea = field.control === "textarea" || field.control === "json";
    const currentValue = stringifyFormValue(value);

    return (
      <label
        key={field.key}
        className={fieldClassName}
        data-control={field.control}
        data-read-only={field.readOnly ? "true" : "false"}
      >
        <span>{localizeCopy(field.label, locale)}</span>
        {isTextarea ? (
          <textarea
            {...commonProps}
            rows={field.rows ?? (field.control === "json" ? 6 : 4)}
            value={currentValue}
            readOnly={field.readOnly}
            placeholder={field.placeholder ? localizeCopy(field.placeholder, locale) : undefined}
            onChange={(event) => handleFieldChange(field, event.currentTarget.value)}
          />
        ) : isSelect ? (
          <select
            {...commonProps}
            value={currentValue}
            disabled={field.readOnly}
            onChange={(event) => handleFieldChange(field, event.currentTarget.value)}
          >
            {(field.options ?? []).map((option) => (
              <option key={option.value} value={option.value}>
                {localizeCopy(option.label, locale)}
              </option>
            ))}
          </select>
        ) : field.control === "switch" ? (
          <input
            {...commonProps}
            type="checkbox"
            checked={Boolean(value)}
            disabled={field.readOnly}
            onChange={(event) => handleFieldChange(field, event.currentTarget.checked)}
          />
        ) : (
          <input
            {...commonProps}
            type={field.control === "number" ? "number" : field.control}
            value={currentValue}
            readOnly={field.readOnly}
            min={field.min}
            step={field.step}
            placeholder={field.placeholder ? localizeCopy(field.placeholder, locale) : undefined}
            onChange={(event) => handleFieldChange(field, event.currentTarget.value)}
          />
        )}
        {field.description ? (
          <span id={hintId} className="form-hint">
            {localizeCopy(field.description, locale)}
          </span>
        ) : null}
        {errors[field.key] ? (
          <span id={errorId} className="field-error" role="alert">
            {errors[field.key]}
          </span>
        ) : null}
      </label>
    );
  };

  return (
    <form className={joinClassNames("form", className)} action={action} noValidate onSubmit={handleSubmit}>
      <IntakeVariantPicker
        contracts={contracts}
        label={variantLabel}
        locale={locale}
        selectedVariant={selectedVariant}
        onChange={handleVariantChange}
      />

      <IntakeTemplateMenu
        resourceKind={currentContract.resourceKind}
        variant={currentContract.variant}
        values={values}
        locale={locale}
        onApply={handleTemplateApply}
      />

      {currentContract.sections.map((section) => {
        const visibleFields = section.fields.filter((field) => isFieldVisible(field, values));
        if (visibleFields.length === 0) {
          return null;
        }

        const basicFields = visibleFields.filter((field) => !field.advanced);
        const advancedFields = visibleFields.filter((field) => field.advanced);
        const showSectionHeader = currentContract.sections.length > 1 || Boolean(section.description);

        return (
          <section key={section.id} className="intake-section">
            {showSectionHeader ? (
              <div className="intake-section-header">
                <div className="kicker">{localizeCopy(section.title, locale)}</div>
                {section.description ? (
                  <p className="muted">{localizeCopy(section.description, locale)}</p>
                ) : null}
              </div>
            ) : null}

            {basicFields.length > 0 ? (
              <div className="intake-field-grid">
                {basicFields.map((field) => renderField(field))}
              </div>
            ) : null}

            {advancedFields.length > 0 ? (
              <details
                className="compact-details"
                open={advancedFields.some((field) => Boolean(errors[field.key])) || undefined}
              >
                <summary>{localizeCopy(advancedSummary, locale)}</summary>
                <div className="stack">
                  <div className="intake-field-grid">
                    {advancedFields.map((field) => renderField(field))}
                  </div>
                </div>
              </details>
            ) : null}
          </section>
        );
      })}

      <input type="hidden" name="intake_variant" value={selectedVariant} />
      {Object.entries(hiddenValues).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}

      <IntakePayloadPreview payload={previewPayload} locale={locale} />

      <button type="submit">{localizeCopy(submitLabel, locale)}</button>
    </form>
  );
}
