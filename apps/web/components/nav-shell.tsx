import Link from "next/link";
import { ReactNode } from "react";

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

export function NavShell({ title, eyebrow, subtitle, children }: NavShellProps) {
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
      </nav>
      {children}
    </div>
  );
}
