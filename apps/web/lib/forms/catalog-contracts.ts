import generatedCatalogSnapshot from "./generated/intake-catalog.json";
import type {
  IntakeCatalogField,
  IntakeCatalogResponse,
  IntakeCatalogResource,
  IntakeCatalogSection,
  IntakeCatalogVariant,
} from "./catalog-types";
import { adaptResourceCatalog, createCatalogBehaviorMap } from "./catalog-adapter";
import {
  buildCapabilityContracts,
  defaultCapabilityVariant,
  type SecretBindingOption,
} from "./capabilities-contracts";
import { agentContracts, defaultAgentVariant } from "./agents-contracts";
import { defaultSecretVariant, secretContracts } from "./secrets-contracts";
import { defaultTaskVariant, taskContracts } from "./tasks-contracts";
import type { FieldOption, IntakeVariantContract, ResourceKind } from "./types";

type ResolvedCatalogContracts = {
  defaultVariant: string;
  contracts: IntakeVariantContract[];
};

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

const generatedCatalog: IntakeCatalogResponse = {
  resource_kinds: generatedCatalogSnapshot.resource_kinds.map((resource) => normalizeCatalogResource(resource)),
};

function getResourceCatalog(
  catalog: IntakeCatalogResponse | null | undefined,
  kind: ResourceKind,
) {
  return catalog?.resource_kinds.find((resource) => resource.kind === kind) ?? null;
}

function resolveCatalogContracts(
  catalog: IntakeCatalogResponse | null | undefined,
  kind: ResourceKind,
  fallbackDefaultVariant: string,
  fallbackContracts: IntakeVariantContract[],
  optionSources: Record<string, FieldOption[]> = {},
): ResolvedCatalogContracts {
  const resourceCatalog = getResourceCatalog(catalog ?? generatedCatalog, kind);
  if (!resourceCatalog) {
    return {
      defaultVariant: fallbackDefaultVariant,
      contracts: fallbackContracts,
    };
  }

  const adapted = adaptResourceCatalog(
    resourceCatalog,
    createCatalogBehaviorMap(fallbackContracts),
    optionSources,
  );

  return {
    defaultVariant: adapted.defaultVariant,
    contracts: adapted.contracts,
  };
}

function toSecretInventoryOptions(secrets: SecretBindingOption[]): FieldOption[] {
  return secrets.map((secret) => ({
    value: secret.id,
    label: {
      en: secret.display_name,
      zh: secret.display_name,
    },
  }));
}

export function buildSecretContractsFromCatalog(
  catalog: IntakeCatalogResponse | null | undefined,
): ResolvedCatalogContracts {
  return resolveCatalogContracts(catalog, "secret", defaultSecretVariant, secretContracts);
}

export function buildCapabilityContractsFromCatalog(
  catalog: IntakeCatalogResponse | null | undefined,
  secrets: SecretBindingOption[],
): ResolvedCatalogContracts {
  const fallbackContracts = buildCapabilityContracts(secrets);
  return resolveCatalogContracts(
    catalog,
    "capability",
    defaultCapabilityVariant,
    fallbackContracts,
    {
      management_secret_inventory: toSecretInventoryOptions(secrets),
    },
  );
}

export function buildTaskContractsFromCatalog(
  catalog: IntakeCatalogResponse | null | undefined,
): ResolvedCatalogContracts {
  return resolveCatalogContracts(catalog, "task", defaultTaskVariant, taskContracts);
}

export function buildAgentContractsFromCatalog(
  catalog: IntakeCatalogResponse | null | undefined,
): ResolvedCatalogContracts {
  return resolveCatalogContracts(catalog, "agent", defaultAgentVariant, agentContracts);
}
