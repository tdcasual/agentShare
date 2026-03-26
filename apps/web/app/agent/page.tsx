import { NavShell } from "../../components/nav-shell";
import { getApiBaseUrl } from "../../lib/api";
import { getLocale } from "../../lib/i18n-server";
import { tr } from "../../lib/i18n-shared";
import { agentSelfServeLabel } from "../../lib/ui";

import { AgentSelfServe } from "./agent-self-serve";

export default async function AgentSelfServePage() {
  const apiBaseUrl = getApiBaseUrl() || "http://127.0.0.1:8000";
  const locale = await getLocale();

  return (
    <NavShell
      eyebrow={agentSelfServeLabel(locale)}
      title={tr(locale, "Run the agent workflow end to end, without source diving.", "不用翻源码，也能完整跑通 Agent 工作流。")}
      subtitle={tr(locale, "Verify your key, claim work, search playbooks, then invoke, lease, and complete.", "验证访问密钥、认领任务、检索手册，然后调用、租约与完成。")}
      activeHref="/agent"
    >
      <AgentSelfServe apiBaseUrl={apiBaseUrl} locale={locale} />
    </NavShell>
  );
}
