"use client";

import type { Locale } from "../lib/i18n-shared";
import type { IntakeCatalogResponse } from "../lib/forms";
import { buildTaskContractsFromCatalog } from "../lib/forms";
import { tr } from "../lib/i18n-shared";
import { IntakeFormRenderer } from "./forms";

export function TaskForm({
  action,
  catalog,
  locale = "en",
}: {
  action: (formData: FormData) => void | Promise<void>;
  catalog: IntakeCatalogResponse | null;
  locale?: Locale;
}) {
  const formCatalog = buildTaskContractsFromCatalog(catalog);

  return (
    <section className="panel stack">
      <div>
        <div className="kicker">{tr(locale, "New task", "新建任务")}</div>
        <h2>{tr(locale, "Publish a task", "发布任务")}</h2>
        <p className="muted">
          {tr(
            locale,
            "Start with title, task type, and input. Keep policy and references in Advanced unless they matter right now.",
            "先填写标题、任务类型和输入。除非现在必须，否则把策略与引用放到高级设置里。",
          )}
        </p>
      </div>
      <IntakeFormRenderer
        action={action}
        contracts={formCatalog.contracts}
        defaultVariant={formCatalog.defaultVariant}
        locale={locale}
        submitLabel={{ en: "Create task", zh: "创建任务" }}
        variantLabel={{ en: "Task template", zh: "任务模板" }}
      />
    </section>
  );
}
