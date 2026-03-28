import type { Locale } from "../i18n-shared";

import type {
  IntakeCatalogField,
  IntakeCatalogResource,
  IntakeCatalogVariant,
} from "./catalog-types";
import type {
  FieldOption,
  FieldSpec,
  FieldControl,
  FormSection,
  FormValues,
  IntakeVariantContract,
  SerializedFormValues,
  ValidationErrors,
} from "./types";

type IntakeVariantBehavior = Pick<IntakeVariantContract, "serialize" | "validate">;
type IntakeCatalogBehaviorMap = Record<string, IntakeVariantBehavior>;
type OptionSourceMap = Record<string, FieldOption[]>;

export type AdaptedResourceCatalog = {
  kind: IntakeCatalogResource["kind"];
  defaultVariant: string;
  contracts: IntakeVariantContract[];
};

function defaultSerialize(values: FormValues): SerializedFormValues {
  return Object.entries(values).reduce<SerializedFormValues>((accumulator, [key, value]) => {
    accumulator[key] = typeof value === "boolean" ? (value ? "true" : "false") : String(value ?? "");
    return accumulator;
  }, {});
}

function defaultValidate(): ValidationErrors {
  return {};
}

function getBehaviorKey(resourceKind: string, variant: string): string {
  return `${resourceKind}:${variant}`;
}

function normalizeControl(control: string): FieldControl {
  switch (control) {
    case "text":
    case "password":
    case "textarea":
    case "number":
    case "select":
    case "json":
    case "chips":
    case "switch":
      return control;
    default:
      return "text";
  }
}

function adaptField(field: IntakeCatalogField, optionSources: OptionSourceMap): FieldSpec {
  const options = field.options_source
    ? (optionSources[field.options_source] ?? [])
    : (field.options ?? []).map<FieldOption>((option) => ({
        value: option.value,
        label: option.label,
      }));
  const defaultValue = field.default_value
    ?? (
      field.control === "select"
      && field.options_source
      && options.length > 0
        ? options[0]?.value
        : undefined
    );

  return {
    key: field.key,
    control: normalizeControl(field.control),
    label: field.label,
    description: field.description,
    placeholder: field.placeholder,
    defaultValue,
    required: field.required ?? false,
    advanced: field.advanced ?? false,
    readOnly: field.read_only ?? false,
    options,
    optionsSource: field.options_source,
  };
}

function adaptSections(variant: IntakeCatalogVariant, optionSources: OptionSourceMap): FormSection[] {
  return variant.sections.map((section) => ({
    id: section.id,
    title: section.title,
    description: section.description,
    fields: section.fields.map((field) => adaptField(field, optionSources)),
  }));
}

export function adaptCatalogVariant(
  variant: IntakeCatalogVariant,
  behavior?: IntakeVariantBehavior,
  optionSources: OptionSourceMap = {},
): IntakeVariantContract {
  const serialize = behavior?.serialize ?? defaultSerialize;
  const validate = behavior?.validate ?? ((_: FormValues, __: Locale) => defaultValidate());

  return {
    resourceKind: variant.resource_kind,
    variant: variant.variant,
    title: variant.title,
    summary: variant.summary,
    sections: adaptSections(variant, optionSources),
    serialize,
    validate,
  };
}

export function adaptResourceCatalog(
  resource: IntakeCatalogResource,
  behaviors: IntakeCatalogBehaviorMap = {},
  optionSources: OptionSourceMap = {},
): AdaptedResourceCatalog {
  return {
    kind: resource.kind,
    defaultVariant: resource.default_variant,
    contracts: resource.variants.map((variant) =>
      adaptCatalogVariant(
        variant,
        behaviors[getBehaviorKey(resource.kind, variant.variant)],
        optionSources,
      )),
  };
}

export function createCatalogBehaviorMap(
  contracts: IntakeVariantContract[],
): IntakeCatalogBehaviorMap {
  return contracts.reduce<IntakeCatalogBehaviorMap>((accumulator, contract) => {
    accumulator[getBehaviorKey(contract.resourceKind, contract.variant)] = {
      serialize: contract.serialize,
      validate: contract.validate,
    };
    return accumulator;
  }, {});
}

export function createVariantBehaviorMap(
  resourceKind: string,
  behaviors: Record<string, IntakeVariantBehavior>,
): IntakeCatalogBehaviorMap {
  return Object.entries(behaviors).reduce<IntakeCatalogBehaviorMap>((accumulator, [variant, behavior]) => {
    accumulator[getBehaviorKey(resourceKind, variant)] = behavior;
    return accumulator;
  }, {});
}
