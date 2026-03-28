import type { Locale } from "../i18n-shared";

export type ResourceKind = "secret" | "capability" | "task" | "agent";

export type LocalizedCopy = {
  en: string;
  zh: string;
};

export type FieldControl =
  | "text"
  | "password"
  | "textarea"
  | "number"
  | "select"
  | "json"
  | "chips"
  | "switch";

export type VisibilityRule = {
  field: string;
  equals?: string | boolean;
  notEquals?: string | boolean;
};

export type FieldOption = {
  value: string;
  label: LocalizedCopy;
};

export type FormValue = string | boolean;

export type FieldSpec = {
  key: string;
  control: FieldControl;
  label: LocalizedCopy;
  description?: LocalizedCopy;
  placeholder?: LocalizedCopy;
  defaultValue?: FormValue;
  required?: boolean;
  advanced?: boolean;
  readOnly?: boolean;
  rows?: number;
  min?: number;
  step?: number;
  options?: FieldOption[];
  visibleWhen?: VisibilityRule[];
};

export type FormSection = {
  id: string;
  title: LocalizedCopy;
  description?: LocalizedCopy;
  fields: FieldSpec[];
};

export type ValidationErrors = Record<string, string>;
export type FormValues = Record<string, FormValue>;
export type SerializedFormValues = Record<string, string>;

export type IntakeVariantContract = {
  resourceKind: ResourceKind;
  variant: string;
  title: LocalizedCopy;
  summary: LocalizedCopy;
  sections: FormSection[];
  serialize(values: FormValues): SerializedFormValues;
  validate?(values: FormValues, locale: Locale): ValidationErrors;
};
