"use client";

import { useEffect, useState } from "react";

import type { Locale } from "../../lib/i18n-shared";
import type { FormValues, ResourceKind } from "../../lib/forms";
import { tr } from "../../lib/i18n-shared";

function templateStorageKey(resourceKind: ResourceKind, variant: string) {
  return `acp-intake-template:${resourceKind}:${variant}`;
}

export function IntakeTemplateMenu({
  resourceKind,
  variant,
  values,
  locale = "en",
  onApply,
}: {
  resourceKind: ResourceKind;
  variant: string;
  values: FormValues;
  locale?: Locale;
  onApply: (nextValues: FormValues) => void;
}) {
  const [hasSavedTemplate, setHasSavedTemplate] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setHasSavedTemplate(Boolean(window.localStorage.getItem(templateStorageKey(resourceKind, variant))));
  }, [resourceKind, variant]);

  const handleSave = () => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      templateStorageKey(resourceKind, variant),
      JSON.stringify(values),
    );
    setHasSavedTemplate(true);
  };

  const handleApply = () => {
    if (typeof window === "undefined") {
      return;
    }

    const stored = window.localStorage.getItem(templateStorageKey(resourceKind, variant));
    if (!stored) {
      return;
    }

    onApply(JSON.parse(stored) as FormValues);
  };

  const handleClear = () => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.removeItem(templateStorageKey(resourceKind, variant));
    setHasSavedTemplate(false);
  };

  return (
    <section className="panel stack panel-limit">
      <div>
        <div className="kicker">{tr(locale, "Template reuse", "模板复用")}</div>
        <h2>{tr(locale, "Save a starter and reuse it for this intake type", "保存这一类录入的常用起始模板")}</h2>
      </div>
      <div className="chip-row">
        <button type="button" onClick={handleSave}>
          {tr(locale, "Save template", "保存模板")}
        </button>
        <button type="button" onClick={handleApply} disabled={!hasSavedTemplate}>
          {tr(locale, "Use saved template", "使用已保存模板")}
        </button>
        <button type="button" className="button-link secondary" onClick={handleClear} disabled={!hasSavedTemplate}>
          {tr(locale, "Clear template", "清除模板")}
        </button>
      </div>
    </section>
  );
}
