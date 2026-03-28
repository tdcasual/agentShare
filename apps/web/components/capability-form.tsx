"use client";

import type { Locale } from "../lib/i18n-shared";
import {
  buildCapabilityContractsFromCatalog,
  type IntakeCatalogResponse,
  type SecretBindingOption,
} from "../lib/forms";
import { tr } from "../lib/i18n-shared";
import { IntakeFormRenderer } from "./forms";

export function CapabilityForm({
  action,
  catalog,
  secrets,
  locale = "en",
}: {
  action: (formData: FormData) => void | Promise<void>;
  catalog: IntakeCatalogResponse | null;
  secrets: SecretBindingOption[];
  locale?: Locale;
}) {
  const formCatalog = buildCapabilityContractsFromCatalog(catalog, secrets);

  return (
    <section className="panel stack" aria-labelledby="capability-form-title">
      <div>
        <div className="kicker">{tr(locale, "Capability studio", "能力工作台")}</div>
        <h2 id="capability-form-title">
          {tr(locale, "Bind a secret into a single, reviewable ability.", "把密钥绑定成一个可审核的单一能力。")}
        </h2>
        <p className="muted">
          {tr(
            locale,
            "Keep the name and adapter contract narrow. Move policy and JSON into Advanced when they are not needed immediately.",
            "把名称与适配器契约保持足够窄。只有在需要时再去填写高级设置里的策略和 JSON。",
          )}
        </p>
      </div>
      {formCatalog.contracts.length > 0 ? (
        <IntakeFormRenderer
          action={action}
          contracts={formCatalog.contracts}
          defaultVariant={formCatalog.defaultVariant}
          locale={locale}
          submitLabel={{ en: "Create capability", zh: "创建能力" }}
          variantLabel={{ en: "Capability template", zh: "能力模板" }}
        />
      ) : (
        <div className="empty-state">
          {tr(locale, "Create a secret first. A capability is always anchored to one stored credential.", "请先创建密钥。能力必须锚定到一个已存储的凭据。")}
        </div>
      )}
    </section>
  );
}
