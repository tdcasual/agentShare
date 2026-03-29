import { adaptResourceCatalog, createVariantBehaviorMap } from "./catalog-adapter";
import { requireGeneratedCatalogResource } from "./generated-catalog";
import type { IntakeVariantContract } from "./types";
import { serializeContractValues } from "./utils";

const AGENT_PAYLOAD_KEYS = [
  "name",
  "risk_tier",
  "allowed_task_types",
  "allowed_capability_ids",
] as const;

function createAgentBehavior(): Pick<IntakeVariantContract, "serialize"> {
  return {
    serialize(this: IntakeVariantContract, values) {
      return serializeContractValues(this, values, [...AGENT_PAYLOAD_KEYS]);
    },
  };
}

const agentResource = requireGeneratedCatalogResource("agent");

export const defaultAgentVariant = agentResource.default_variant;

const agentBehaviors = Object.fromEntries(
  agentResource.variants.map((variant) => [variant.variant, createAgentBehavior()]),
) as Record<string, Pick<IntakeVariantContract, "serialize">>;

export const agentContracts: IntakeVariantContract[] = adaptResourceCatalog(
  agentResource,
  createVariantBehaviorMap("agent", agentBehaviors),
).contracts;

export function getAgentContract(variant: string): IntakeVariantContract {
  return agentContracts.find((contract) => contract.variant === variant)
    ?? agentContracts.find((contract) => contract.variant === defaultAgentVariant)
    ?? agentContracts[0];
}
