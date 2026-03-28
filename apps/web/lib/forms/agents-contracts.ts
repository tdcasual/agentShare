import { adaptResourceCatalog, createVariantBehaviorMap } from "./catalog-adapter";
import { requireGeneratedCatalogResource } from "./generated-catalog";
import type { IntakeVariantContract } from "./types";

function createAgentBehavior(
  includeTaskScope: boolean,
  includeCapabilityScope: boolean,
): Pick<IntakeVariantContract, "serialize"> {
  return {
    serialize(values) {
      return {
        name: String(values.name ?? ""),
        risk_tier: String(values.risk_tier ?? "medium"),
        allowed_task_types: includeTaskScope ? String(values.allowed_task_types ?? "") : "",
        allowed_capability_ids: includeCapabilityScope ? String(values.allowed_capability_ids ?? "") : "",
      };
    },
  };
}

const agentResource = requireGeneratedCatalogResource("agent");

export const defaultAgentVariant = agentResource.default_variant;

const agentBehaviors: Record<string, Pick<IntakeVariantContract, "serialize">> = {
  general_agent: createAgentBehavior(false, false),
  task_scoped: createAgentBehavior(true, false),
  capability_scoped: createAgentBehavior(false, true),
  fully_scoped: createAgentBehavior(true, true),
};

export const agentContracts: IntakeVariantContract[] = adaptResourceCatalog(
  agentResource,
  createVariantBehaviorMap("agent", agentBehaviors),
).contracts;

export function getAgentContract(variant: string): IntakeVariantContract {
  return agentContracts.find((contract) => contract.variant === variant)
    ?? agentContracts.find((contract) => contract.variant === defaultAgentVariant)
    ?? agentContracts[0];
}
