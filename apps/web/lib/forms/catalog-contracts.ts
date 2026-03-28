import type { IntakeCatalogResponse } from "./catalog-types";
import { adaptResourceCatalog, createCatalogBehaviorMap } from "./catalog-adapter";
import {
  buildCapabilityContracts,
  defaultCapabilityVariant,
  type SecretBindingOption,
} from "./capabilities-contracts";
import { agentContracts, defaultAgentVariant } from "./agents-contracts";
import { generatedCatalog } from "./generated-catalog";
import { defaultSecretVariant, secretContracts } from "./secrets-contracts";
import { defaultTaskVariant, taskContracts } from "./tasks-contracts";
import type { FieldOption, IntakeVariantContract, ResourceKind } from "./types";

type ResolvedCatalogContracts = {
  defaultVariant: string;
  contracts: IntakeVariantContract[];
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
