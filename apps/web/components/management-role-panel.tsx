import type { ManagementRole } from "../lib/management-session";
import type { Locale } from "../lib/i18n-shared";
import { tr } from "../lib/i18n-shared";
import { managementRoleLabel } from "../lib/ui";

export function ManagementRolePanel({
  locale = "en",
  currentRole,
  requiredRole,
  title,
  description,
}: {
  locale?: Locale;
  currentRole?: ManagementRole;
  requiredRole: ManagementRole;
  title: string;
  description: string;
}) {
  const currentRoleText = currentRole
    ? managementRoleLabel(locale, currentRole)
    : tr(locale, "Unknown", "未知");

  return (
    <section className="panel stack">
      <div>
        <div className="kicker">{tr(locale, "Role boundary", "角色边界")}</div>
        <h2>{title}</h2>
        <p className="muted">{description}</p>
      </div>
      <div className="info-rail">
        <strong>
          {tr(locale, "Current role", "当前角色")}:
          {" "}
          {currentRoleText}
        </strong>
        <p className="muted">
          {tr(locale, "Required role", "所需角色")}:
          {" "}
          {managementRoleLabel(locale, requiredRole)}
        </p>
      </div>
    </section>
  );
}
