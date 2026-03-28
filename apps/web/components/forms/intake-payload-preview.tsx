"use client";

import type { Locale } from "../../lib/i18n-shared";
import type { SerializedFormValues } from "../../lib/forms";
import { tr } from "../../lib/i18n-shared";

export function IntakePayloadPreview({
  payload,
  locale = "en",
}: {
  payload: SerializedFormValues;
  locale?: Locale;
}) {
  return (
    <section className="panel stack panel-limit" data-testid="intake-payload-preview">
      <div>
        <div className="kicker">{tr(locale, "Payload preview", "提交预览")}</div>
        <h2>{tr(locale, "Review exactly what will be submitted", "确认即将提交的实际 payload")}</h2>
      </div>
      <pre className="payload-preview">{JSON.stringify(payload, null, 2)}</pre>
    </section>
  );
}
