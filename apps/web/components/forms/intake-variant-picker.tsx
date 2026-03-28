import type { Locale } from "../../lib/i18n-shared";
import type { IntakeVariantContract, LocalizedCopy } from "../../lib/forms";
import { localizeCopy } from "../../lib/forms";

export function IntakeVariantPicker({
  contracts,
  label,
  locale,
  selectedVariant,
  onChange,
}: {
  contracts: IntakeVariantContract[];
  label: LocalizedCopy;
  locale: Locale;
  selectedVariant: string;
  onChange: (variant: string) => void;
}) {
  if (contracts.length === 0) {
    return null;
  }

  return (
    <section className="stack intake-variant-picker" data-testid="intake-variant-picker">
      <div className="stack stack-tight">
        <div className="kicker">{localizeCopy(label, locale)}</div>
        <p className="muted">
          {locale === "zh"
            ? "先选择最接近实际用途的录入模板，再补充具体字段。"
            : "Start with the intake template that is closest to the job, then fill in the specific contract details."}
        </p>
      </div>
      <div
        className="intake-variant-grid"
        role="radiogroup"
        aria-label={localizeCopy(label, locale)}
      >
        {contracts.map((contract) => {
          const isSelected = contract.variant === selectedVariant;

          return (
            <label
              key={contract.variant}
              className="intake-variant-option"
              data-selected={isSelected}
              data-testid={`variant-option-${contract.variant}`}
            >
              <input
                className="intake-variant-radio"
                type="radio"
                name={`${contract.resourceKind}-variant`}
                aria-label={localizeCopy(contract.title, locale)}
                checked={isSelected}
                onChange={() => onChange(contract.variant)}
              />
              <span className="intake-variant-copy">
                <strong>{localizeCopy(contract.title, locale)}</strong>
                <span className="muted" aria-hidden="true">
                  {localizeCopy(contract.summary, locale)}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </section>
  );
}
