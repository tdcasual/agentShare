import Link from "next/link";
import { ReactNode } from "react";

import { logoutManagementAction } from "../app/actions";
import { LangToggle } from "../components/lang-toggle";
import { getLocale } from "../lib/i18n-server";
import type { Locale } from "../lib/i18n-shared";
import { tr } from "../lib/i18n-shared";
import { hasManagementSession } from "../lib/management-session";

type NavShellProps = {
  title: string;
  eyebrow: string;
  subtitle: string;
  activeHref?: string;
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

export async function NavShell({ title, eyebrow, subtitle, activeHref, children }: NavShellProps) {
  const signedIn = await hasManagementSession();
  const locale = await getLocale();
  return (
    <div className="shell">
      <header className="masthead">
        <span className="eyebrow">{eyebrow}</span>
        <h1 className="title">{title}</h1>
        <p className="subtitle">{subtitle}</p>
      </header>
      <nav className="nav" aria-label="Primary">
        {links.map((link) => {
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
      {children}
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
      return tr(locale, "Agent", "自助台");
    case "Secrets":
      return tr(locale, "Secrets", "密钥");
    case "Capabilities":
      return tr(locale, "Capabilities", "能力");
    case "Tasks":
      return tr(locale, "Tasks", "任务");
    case "Approvals":
      return tr(locale, "Approvals", "审批");
    case "Agents":
      return tr(locale, "Agents", "代理");
    case "Runs":
      return tr(locale, "Runs", "运行记录");
    case "Playbooks":
      return tr(locale, "Playbooks", "手册");
    default:
      return labelKey;
  }
}
