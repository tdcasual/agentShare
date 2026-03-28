import {
  buildAgentContractsFromCatalog,
  buildCapabilityContractsFromCatalog,
  buildSecretContractsFromCatalog,
  buildTaskContractsFromCatalog,
} from "./catalog-contracts";
import type { FieldSpec, FormValue, IntakeVariantContract, ResourceKind } from "./types";

type ContractFieldSummary = {
  key: string;
  control: string;
  required: boolean;
  advanced: boolean;
  read_only: boolean;
  default_value: FormValue | null;
  options_source: string | null;
  option_values: string[];
};

type ContractSectionSummary = {
  id: string;
  title: {
    en: string;
    zh: string;
  };
  fields: ContractFieldSummary[];
};

type ContractVariantSummary = {
  title: {
    en: string;
    zh: string;
  };
  summary: {
    en: string;
    zh: string;
  };
  sections: ContractSectionSummary[];
};

type ContractResourceSummary = {
  default_variant: string;
  variants: Record<string, ContractVariantSummary>;
};

export type FrontendContractSummary = Record<ResourceKind, ContractResourceSummary>;

function normalizeDefaultValue(value: FormValue | undefined): FormValue | null {
  if (value === undefined || value === "") {
    return null;
  }
  return value;
}

function summarizeField(field: FieldSpec): ContractFieldSummary {
  return {
    key: field.key,
    control: field.control,
    required: field.required ?? false,
    advanced: field.advanced ?? false,
    read_only: field.readOnly ?? false,
    default_value: normalizeDefaultValue(field.defaultValue),
    options_source: field.optionsSource ?? null,
    option_values: (field.options ?? []).map((option) => option.value),
  };
}

function summarizeVariant(contract: IntakeVariantContract): ContractVariantSummary {
  return {
    title: contract.title,
    summary: contract.summary,
    sections: contract.sections.map((section) => ({
      id: section.id,
      title: section.title,
      fields: section.fields.map((field) => summarizeField(field)),
    })),
  };
}

function summarizeResource(
  defaultVariant: string,
  contracts: IntakeVariantContract[],
): ContractResourceSummary {
  return {
    default_variant: defaultVariant,
    variants: Object.fromEntries(
      contracts.map((contract) => [contract.variant, summarizeVariant(contract)]),
    ),
  };
}

export function getFrontendContractSummary(): FrontendContractSummary {
  const secret = buildSecretContractsFromCatalog(null);
  const capability = buildCapabilityContractsFromCatalog(null, []);
  const task = buildTaskContractsFromCatalog(null);
  const agent = buildAgentContractsFromCatalog(null);

  return {
    secret: summarizeResource(secret.defaultVariant, secret.contracts),
    capability: summarizeResource(capability.defaultVariant, capability.contracts),
    task: summarizeResource(task.defaultVariant, task.contracts),
    agent: summarizeResource(agent.defaultVariant, agent.contracts),
  };
}
