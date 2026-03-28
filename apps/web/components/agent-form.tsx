"use client";

import type { Locale } from "../lib/i18n-shared";
import { agentContracts, defaultAgentVariant } from "../lib/forms";
import { IntakeFormRenderer } from "./forms";

export function AgentForm({
  action,
  locale = "en",
}: {
  action: (formData: FormData) => void | Promise<void>;
  locale?: Locale;
}) {
  return (
    <IntakeFormRenderer
      action={action}
      contracts={agentContracts}
      defaultVariant={defaultAgentVariant}
      locale={locale}
      className="panel-limit"
      submitLabel={{ en: "Create agent", zh: "创建 Agent" }}
      variantLabel={{ en: "Agent scope", zh: "Agent 模板" }}
    />
  );
}
