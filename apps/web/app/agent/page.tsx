import { NavShell } from "../../components/nav-shell";
import { getApiBaseUrl } from "../../lib/api";

import { AgentSelfServe } from "./agent-self-serve";

export default function AgentSelfServePage() {
  const apiBaseUrl = getApiBaseUrl() || "http://127.0.0.1:8000";

  return (
    <NavShell
      eyebrow="Agent self-serve"
      title="Run the agent workflow end to end, without source diving."
      subtitle="Verify an agent key, claim work, search playbooks via MCP, invoke capabilities, request leases, and complete tasks."
      activeHref="/agent"
    >
      <AgentSelfServe apiBaseUrl={apiBaseUrl} />
    </NavShell>
  );
}

