import generatedCatalogSnapshot from "./generated/intake-catalog.json";
import type {
  IntakeCatalogField,
  IntakeCatalogResponse,
  IntakeCatalogResource,
  IntakeCatalogSection,
  IntakeCatalogVariant,
} from "./catalog-types";
import type { ResourceKind } from "./types";

function normalizeCatalogField(field: typeof generatedCatalogSnapshot.resource_kinds[number]["variants"][number]["sections"][number]["fields"][number]): IntakeCatalogField {
  return {
    key: field.key,
    control: field.control,
    label: field.label,
    description: field.description ?? undefined,
    placeholder: field.placeholder ?? undefined,
    default_value: field.default_value,
    required: field.required,
    advanced: field.advanced,
    read_only: field.read_only,
    options: field.options,
    options_source: field.options_source ?? undefined,
  };
}

function normalizeCatalogSection(section: typeof generatedCatalogSnapshot.resource_kinds[number]["variants"][number]["sections"][number]): IntakeCatalogSection {
  return {
    id: section.id,
    title: section.title,
    description: section.description ?? undefined,
    fields: section.fields.map((field) => normalizeCatalogField(field)),
  };
}

function normalizeCatalogVariant(variant: typeof generatedCatalogSnapshot.resource_kinds[number]["variants"][number]): IntakeCatalogVariant {
  return {
    resource_kind: variant.resource_kind as ResourceKind,
    variant: variant.variant,
    title: variant.title,
    summary: variant.summary,
    sections: variant.sections.map((section) => normalizeCatalogSection(section)),
  };
}

function normalizeCatalogResource(resource: typeof generatedCatalogSnapshot.resource_kinds[number]): IntakeCatalogResource {
  return {
    kind: resource.kind as ResourceKind,
    default_variant: resource.default_variant,
    variants: resource.variants.map((variant) => normalizeCatalogVariant(variant)),
  };
}

export const generatedCatalog: IntakeCatalogResponse = {
  resource_kinds: generatedCatalogSnapshot.resource_kinds.map((resource) => normalizeCatalogResource(resource)),
};

export function getGeneratedCatalogResource(kind: ResourceKind): IntakeCatalogResource | null {
  return generatedCatalog.resource_kinds.find((resource) => resource.kind === kind) ?? null;
}

export function requireGeneratedCatalogResource(kind: ResourceKind): IntakeCatalogResource {
  const resource = getGeneratedCatalogResource(kind);
  if (!resource) {
    throw new Error(`Generated intake catalog is missing the ${kind} resource.`);
  }
  return resource;
}
