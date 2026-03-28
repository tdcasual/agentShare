"use client";

import type { Locale } from "../lib/i18n-shared";
import type { IntakeCatalogResponse } from "../lib/forms";
import { buildAgentContractsFromCatalog } from "../lib/forms";
import { IntakeFormRenderer } from "./forms";

export function AgentForm({
  action,
  catalog,
  locale = "en",
}: {
  action: (formData: FormData) => void | Promise<void>;
  catalog: IntakeCatalogResponse | null;
  locale?: Locale;
}) {
  const formCatalog = buildAgentContractsFromCatalog(catalog);

  return (
    <IntakeFormRenderer
      action={action}
      contracts={formCatalog.contracts}
      defaultVariant={formCatalog.defaultVariant}
      locale={locale}
      className="panel-limit"
      submitLabel={{ en: "Create agent", zh: "创建 Agent" }}
      variantLabel={{ en: "Agent scope", zh: "Agent 模板" }}
    />
  );
}
