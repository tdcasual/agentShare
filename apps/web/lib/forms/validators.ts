import type { Locale } from "../i18n-shared";

import type { FormValues, IntakeVariantContract, ValidationErrors } from "./types";
import { getAllFields, isFieldVisible, localizeCopy, stringifyFormValue } from "./utils";

export function mergeValidationErrors(...maps: ValidationErrors[]): ValidationErrors {
  return maps.reduce<ValidationErrors>((accumulator, map) => ({ ...accumulator, ...map }), {});
}

export function validateRequiredFields(
  contract: IntakeVariantContract,
  values: FormValues,
  locale: Locale,
): ValidationErrors {
  return getAllFields(contract).reduce<ValidationErrors>((errors, field) => {
    if (!field.required || !isFieldVisible(field, values)) {
      return errors;
    }

    const value = stringifyFormValue(values[field.key]).trim();
    if (!value) {
      errors[field.key] =
        locale === "zh"
          ? `${localizeCopy(field.label, locale)}不能为空。`
          : `${localizeCopy(field.label, locale)} is required.`;
    }

    return errors;
  }, {});
}

export function validateJsonField(
  value: string,
  fieldLabel: string,
  locale: Locale,
  shape: "object" | "array",
): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed);

    if (shape === "object" && (Array.isArray(parsed) || parsed === null || typeof parsed !== "object")) {
      return locale === "zh" ? `${fieldLabel}必须是 JSON 对象。` : `${fieldLabel} must be a JSON object.`;
    }

    if (shape === "array" && !Array.isArray(parsed)) {
      return locale === "zh" ? `${fieldLabel}必须是 JSON 数组。` : `${fieldLabel} must be a JSON array.`;
    }

    return null;
  } catch {
    return locale === "zh" ? `${fieldLabel}必须是合法 JSON。` : `${fieldLabel} must be valid JSON.`;
  }
}

export function validatePositiveIntegerField(
  value: string,
  fieldLabel: string,
  locale: Locale,
): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number.parseInt(trimmed, 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    return locale === "zh"
      ? `${fieldLabel}必须是大于 0 的整数。`
      : `${fieldLabel} must be a positive integer.`;
  }

  return null;
}
