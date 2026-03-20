import Link from "next/link";
import { ReactNode } from "react";

import { logoutManagementAction } from "../app/actions";
import { hasManagementSession } from "../lib/management-session";

type NavShellProps = {
  title: string;
  eyebrow: string;
  subtitle: string;
  children: ReactNode;
};

const links = [
  { href: "/", label: "Overview" },
  { href: "/secrets", label: "Secrets" },
  { href: "/capabilities", label: "Capabilities" },
  { href: "/tasks", label: "Tasks" },
  { href: "/agents", label: "Agents" },
  { href: "/runs", label: "Runs" },
  { href: "/playbooks", label: "Playbooks" },
];

export async function NavShell({ title, eyebrow, subtitle, children }: NavShellProps) {
  const signedIn = await hasManagementSession();
  return (
    <div className="shell">
      <header className="masthead">
        <span className="eyebrow">{eyebrow}</span>
        <h1 className="title">{title}</h1>
        <p className="subtitle">{subtitle}</p>
      </header>
      <nav className="nav" aria-label="Primary">
        {links.map((link) => (
          <Link key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
        {signedIn ? (
          <form action={logoutManagementAction}>
            <button type="submit">Log out</button>
          </form>
        ) : (
          <Link href="/login">Login</Link>
        )}
      </nav>
      {children}
    </div>
  );
}
