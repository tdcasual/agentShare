"use client";

import type { Locale } from "../lib/i18n-shared";
import type { IntakeCatalogResponse } from "../lib/forms";
import { buildSecretContractsFromCatalog } from "../lib/forms";
import { tr } from "../lib/i18n-shared";
import { IntakeFormRenderer } from "./forms";

export function SecretsForm({
  action,
  catalog,
  locale = "en",
}: {
  action: (formData: FormData) => void | Promise<void>;
  catalog: IntakeCatalogResponse | null;
  locale?: Locale;
}) {
  const formCatalog = buildSecretContractsFromCatalog(catalog);

  return (
    <section className="panel stack" aria-labelledby="secret-form-title">
      <div>
        <div className="kicker">{tr(locale, "New secret", "新建密钥")}</div>
        <h2 id="secret-form-title">{tr(locale, "Create a secret without exposing it in chat", "创建密钥，不在对话中暴露")}</h2>
        <p className="muted">
          {tr(
            locale,
            "Store the secret once, then let later capabilities reference it by name, scope, and environment.",
            "密钥只录入一次，后续能力通过名称、范围和环境来引用它。",
          )}
        </p>
      </div>
      <IntakeFormRenderer
        action={action}
        contracts={formCatalog.contracts}
        defaultVariant={formCatalog.defaultVariant}
        locale={locale}
        submitLabel={{ en: "Save secret", zh: "保存密钥" }}
        variantLabel={{ en: "Secret type", zh: "密钥模板" }}
      />
    </section>
  );
}
