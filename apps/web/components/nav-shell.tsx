import Link from "next/link";
import { ReactNode } from "react";

import { logoutManagementAction } from "../app/actions";
import { LangToggle } from "../components/lang-toggle";
import { getLocale } from "../lib/i18n-server";
import type { Locale } from "../lib/i18n-shared";
import { tr } from "../lib/i18n-shared";
import { hasManagementSession } from "../lib/management-session";
import { agentSelfServeLabel, agentsCatalogLabel } from "../lib/ui";

type NavShellProps = {
  title: string;
  eyebrow: string;
  subtitle: string;
  activeHref?: string;
  variant?: "hero" | "page" | "minimal";
  headerActions?: ReactNode;
  children: ReactNode;
};

const links = [
  { href: "/", labelKey: "Overview" },
  { href: "/quickstart", labelKey: "Quickstart" },
  { href: "/agent", labelKey: "Agent" },
  { href: "/secrets", labelKey: "Secrets" },
  { href: "/capabilities", labelKey: "Capabilities" },
  { href: "/tasks", labelKey: "Tasks" },
  { href: "/approvals", labelKey: "Approvals" },
  { href: "/agents", labelKey: "Agents" },
  { href: "/runs", labelKey: "Runs" },
  { href: "/playbooks", labelKey: "Playbooks" },
];

export async function NavShell({
  title,
  eyebrow,
  subtitle,
  activeHref,
  variant = "page",
  headerActions,
  children,
}: NavShellProps) {
  const signedIn = await hasManagementSession();
  const locale = await getLocale();
  const activeLabel = navLabel(locale, links.find((link) => link.href === activeHref)?.labelKey ?? "Overview");
  const primaryMobileLinks = links.filter((link) =>
    ["/", "/tasks", "/approvals", "/agent", "/playbooks"].includes(link.href),
  );
  const secondaryMobileLinks = links.filter((link) => !primaryMobileLinks.includes(link));

  return (
    <div className="shell">
      <div className="shell-frame">
        <div className="shell-topbar">
          <div className="shell-brand">
            <Link href="/" className="brand-mark" aria-label="Agent Control Plane home">
              AC
            </Link>
            <div className="brand-copy">
              <strong>{tr(locale, "Agent Control Plane", "Agent 控制平面")}</strong>
            </div>
          </div>
          <div className="shell-meta">
            <span className="shell-pill">
              {signedIn
                ? tr(locale, "Management session active", "管理会话已连接")
                : tr(locale, "Read-only until login", "登录前仅可读")}
            </span>
          </div>
        </div>
        <nav className="nav" aria-label="Primary">
          <div className="nav-cluster">
            {links.slice(0, 5).map((link) => {
              const isActive = Boolean(activeHref && link.href === activeHref);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive ? "page" : undefined}
                  className={isActive ? "is-active" : undefined}
                >
                  {navLabel(locale, link.labelKey)}
                </Link>
              );
            })}
          </div>
          <div className="nav-cluster nav-cluster-secondary">
            {links.slice(5).map((link) => {
              const isActive = Boolean(activeHref && link.href === activeHref);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive ? "page" : undefined}
                  className={isActive ? "is-active" : undefined}
                >
                  {navLabel(locale, link.labelKey)}
                </Link>
              );
            })}
          </div>
          <div className="nav-right">
            <LangToggle locale={locale} />
            {signedIn ? (
              <form action={logoutManagementAction}>
                <button type="submit">{tr(locale, "Log out", "退出登录")}</button>
              </form>
            ) : (
              <Link href="/login">{tr(locale, "Login", "登录")}</Link>
            )}
          </div>
        </nav>
        <details className="mobile-nav">
          <summary>
            <span className="shell-pill">{activeLabel}</span>
            <span className="mobile-nav-summary-copy">
              {tr(locale, "Open navigation", "展开导航")}
            </span>
          </summary>
          <div className="mobile-nav-body">
            <div className="mobile-nav-links">
              {primaryMobileLinks.map((link) => {
                const isActive = Boolean(activeHref && link.href === activeHref);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={isActive ? "page" : undefined}
                    className={isActive ? "is-active" : undefined}
                  >
                    {navLabel(locale, link.labelKey)}
                  </Link>
                );
              })}
            </div>
            <div className="mobile-nav-links mobile-nav-links-secondary">
              {secondaryMobileLinks.map((link) => {
                const isActive = Boolean(activeHref && link.href === activeHref);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={isActive ? "page" : undefined}
                    className={isActive ? "is-active" : undefined}
                  >
                    {navLabel(locale, link.labelKey)}
                  </Link>
                );
              })}
            </div>
            <div className="mobile-nav-actions">
              <LangToggle locale={locale} />
              {signedIn ? (
                <form action={logoutManagementAction}>
                  <button type="submit">{tr(locale, "Log out", "退出登录")}</button>
                </form>
              ) : (
                <Link href="/login">{tr(locale, "Login", "登录")}</Link>
              )}
            </div>
          </div>
        </details>
        <header className="masthead" data-variant={variant}>
          <div className="masthead-copy">
            <span className="eyebrow">{eyebrow}</span>
            <h1 className="title">{title}</h1>
            <p className="subtitle">{subtitle}</p>
            {headerActions ? <div className="masthead-actions">{headerActions}</div> : null}
          </div>
        </header>
        <main className="shell-content">{children}</main>
      </div>
    </div>
  );
}

function navLabel(locale: Locale, labelKey: string) {
  switch (labelKey) {
    case "Overview":
      return tr(locale, "Overview", "概览");
    case "Quickstart":
      return tr(locale, "Quickstart", "快速开始");
    case "Agent":
      return agentSelfServeLabel(locale);
    case "Secrets":
      return tr(locale, "Secrets", "密钥");
    case "Capabilities":
      return tr(locale, "Capabilities", "能力");
    case "Tasks":
      return tr(locale, "Tasks", "任务");
    case "Approvals":
      return tr(locale, "Approvals", "审批");
    case "Agents":
      return agentsCatalogLabel(locale);
    case "Runs":
      return tr(locale, "Runs", "运行记录");
    case "Playbooks":
      return tr(locale, "Playbooks", "手册");
    default:
      return labelKey;
  }
}
