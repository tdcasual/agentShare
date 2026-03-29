import type { Locale } from "../i18n-shared";

import type {
  FieldSpec,
  FormValue,
  FormValues,
  IntakeVariantContract,
  LocalizedCopy,
  SerializedFormValues,
  VisibilityRule,
} from "./types";

export function localizeCopy(copy: LocalizedCopy, locale: Locale): string {
  return locale === "zh" ? copy.zh : copy.en;
}

export function getAllFields(contract: IntakeVariantContract): FieldSpec[] {
  return contract.sections.flatMap((section) => section.fields);
}

function matchesRule(rule: VisibilityRule, values: FormValues): boolean {
  const value = values[rule.field];

  if (rule.equals !== undefined) {
    return value === rule.equals;
  }

  if (rule.notEquals !== undefined) {
    return value !== rule.notEquals;
  }

  return Boolean(value);
}

export function isFieldVisible(field: FieldSpec, values: FormValues): boolean {
  if (!field.visibleWhen || field.visibleWhen.length === 0) {
    return true;
  }

  return field.visibleWhen.every((rule) => matchesRule(rule, values));
}

export function getDefaultValues(contract: IntakeVariantContract): FormValues {
  return getAllFields(contract).reduce<FormValues>((accumulator, field) => {
    if (field.defaultValue !== undefined) {
      accumulator[field.key] = field.defaultValue;
      return accumulator;
    }

    accumulator[field.key] = field.control === "switch" ? false : "";
    return accumulator;
  }, {});
}

function isSelectableValueValid(field: FieldSpec, value: string): boolean {
  if (field.control !== "select" || !field.options || !value) {
    return true;
  }

  return field.options.some((option) => option.value === value);
}

export function getHydratedValues(
  contract: IntakeVariantContract,
  previousValues: FormValues = {},
  previousContract?: IntakeVariantContract,
): FormValues {
  const defaultValues = getDefaultValues(contract);
  const previousDefaultValues = previousContract ? getDefaultValues(previousContract) : {};

  return getAllFields(contract).reduce<FormValues>((accumulator, field) => {
    const defaultValue = defaultValues[field.key];
    const previousValue = previousValues[field.key];
    const previousDefaultValue = previousDefaultValues[field.key];

    if (previousValue === undefined || field.readOnly) {
      accumulator[field.key] = defaultValue;
      return accumulator;
    }

    if (typeof previousValue === "boolean") {
      accumulator[field.key] = previousValue;
      return accumulator;
    }

    const trimmedValue = previousValue.trim();
    if (!trimmedValue) {
      accumulator[field.key] = defaultValue;
      return accumulator;
    }

    if (
      typeof previousDefaultValue === "string"
      && previousDefaultValue.length > 0
      && previousDefaultValue === trimmedValue
      && defaultValue !== previousDefaultValue
    ) {
      accumulator[field.key] = defaultValue;
      return accumulator;
    }

    if (!isSelectableValueValid(field, trimmedValue)) {
      accumulator[field.key] = defaultValue;
      return accumulator;
    }

    accumulator[field.key] = previousValue;
    return accumulator;
  }, {});
}

export function stringifyFormValue(value: FormValue | undefined): string {
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return value ?? "";
}

export function updateFormValue(values: FormValues, key: string, value: FormValue): FormValues {
  return {
    ...values,
    [key]: value,
  };
}

export function buildPreviewPayload(
  contract: IntakeVariantContract,
  values: FormValues,
): SerializedFormValues {
  const serialized = contract.serialize(values);
  const fieldsByKey = new Map(getAllFields(contract).map((field) => [field.key, field]));

  return Object.entries(serialized).reduce<SerializedFormValues>((accumulator, [key, value]) => {
    const field = fieldsByKey.get(key);
    const serializedValue = value.trim();

    if (!field) {
      if (serializedValue) {
        accumulator[key] = value;
      }
      return accumulator;
    }

    if (!serializedValue) {
      return accumulator;
    }

    if (field.advanced) {
      const currentValue = stringifyFormValue(values[key]);
      const defaultValue = field.defaultValue === undefined
        ? ""
        : stringifyFormValue(field.defaultValue);
      const normalizedCurrentValue = currentValue.trim();

      if (
        !normalizedCurrentValue
        || normalizedCurrentValue === defaultValue
        || normalizedCurrentValue === "{}"
        || normalizedCurrentValue === "[]"
      ) {
        return accumulator;
      }
    }

    accumulator[key] = value;
    return accumulator;
  }, {});
}

export function serializeContractValues(
  contract: IntakeVariantContract,
  values: FormValues,
  keys: string[],
): SerializedFormValues {
  const defaultValues = getDefaultValues(contract);

  return keys.reduce<SerializedFormValues>((accumulator, key) => {
    const value = values[key] ?? defaultValues[key] ?? "";
    accumulator[key] = stringifyFormValue(value);
    return accumulator;
  }, {});
}
