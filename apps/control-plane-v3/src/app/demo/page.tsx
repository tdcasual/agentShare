import Link from 'next/link';
import { ArrowRight, Compass, FlaskConical, ShieldCheck } from 'lucide-react';

const SANDBOX_ROUTES = [
  {
    title: 'Identity Sandbox',
    description:
      'Exercise identity cards, filtering, and create flows with fixture data before shipping backend-backed roster changes.',
    demoHref: '/demo/identities',
    liveHref: '/identities',
    status: 'Fixture-only interaction lab',
  },
  {
    title: 'Collaboration Prototype',
    description:
      'Explore conversational layouts and agent collaboration mechanics without mixing them into the operational inbox or event stream.',
    demoHref: '/demo/spaces',
    liveHref: '/spaces',
    status: 'Local-state conversation prototype',
  },
];

export default function DemoHubPage() {
  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      <section className="border-[var(--kw-amber-surface)]/80 dark:border-[var(--kw-dark-amber-surface)]/70 overflow-hidden rounded-[2rem] border bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_42%),linear-gradient(135deg,rgba(255,251,235,0.95),rgba(255,247,237,0.9))] p-8 shadow-[0_20px_60px_-30px_rgba(180,83,9,0.35)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_38%),linear-gradient(135deg,rgba(33,24,12,0.96),rgba(49,31,12,0.92))]">
        <div className="grid gap-8 lg:grid-cols-[1.35fr_0.9fr] lg:items-end">
          <div className="space-y-4">
            <div className="border-[var(--kw-amber-text)]/70 dark:border-[var(--kw-dark-amber-surface)]/80 dark:bg-[var(--kw-dark-amber-surface)]/30 inline-flex items-center gap-2 rounded-full border bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--kw-amber-text)] dark:text-[var(--kw-warning)]">
              <FlaskConical className="h-4 w-4" />
              Sandbox Directory
            </div>
            <div className="space-y-3">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-[var(--kw-text)] md:text-5xl dark:text-[var(--kw-dark-text)]">
                Keep prototype routes separate from the backend-backed console.
              </h1>
              <p className="dark:text-[var(--kw-warning)]/80 text-[var(--kw-amber-text)]/80 max-w-2xl text-base leading-7 md:text-lg">
                This directory is the handoff point between experimental demos and governed
                management surfaces. Use it to preview fixture-only journeys, then compare them
                against the live console before promoting anything.
              </p>
            </div>
          </div>

          <div className="border-[var(--kw-amber-surface)]/80 dark:border-[var(--kw-dark-amber-surface)]/80 dark:bg-[var(--kw-dark-bg)]/30 grid gap-3 rounded-[1.5rem] border bg-white/75 p-3 sm:p-4 lg:p-5 text-sm text-[var(--kw-text-muted)] shadow-sm dark:text-[var(--kw-dark-text-muted)]">
            <div className="flex items-start gap-3">
              <Compass className="mt-0.5 h-4 w-4 text-[var(--kw-amber-text)] dark:text-[var(--kw-warning)]" />
              <p>
                Demo routes are readable without authentication so product walkthroughs stay
                decoupled from operational state.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 text-[var(--kw-amber-text)] dark:text-[var(--kw-warning)]" />
              <p>
                Human operators still govern the live pages. Prototype learnings should graduate
                into backend-backed routes, not become permanent parallel systems.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {SANDBOX_ROUTES.map((route) => (
          <article
            key={route.demoHref}
            className="border-[var(--kw-border)]/80 dark:bg-[var(--kw-dark-bg)]/60 group rounded-[1.75rem] border bg-white/85 p-3 sm:p-4 lg:p-6 shadow-[0_16px_45px_-35px_rgba(0,0,0,0.15)] transition-transform duration-200 hover:-translate-y-0.5 dark:border-[var(--kw-dark-border)]"
          >
            <div className="flex h-full flex-col gap-3 sm:gap-4 lg:gap-5">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--kw-amber-text)] dark:text-[var(--kw-warning)]">
                  {route.status}
                </p>
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold tracking-tight text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
                    {route.title}
                  </h2>
                  <p className="text-sm leading-7 text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
                    {route.description}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Link
                  href={route.demoHref}
                  className="bg-[var(--kw-amber-surface)]/80 hover:bg-[var(--kw-warning)]/30 dark:bg-[var(--kw-dark-amber-surface)]/40 dark:hover:bg-[var(--kw-dark-amber-surface)]/60 inline-flex items-center justify-between rounded-2xl border border-[var(--kw-amber-text)] px-4 py-3 text-sm font-medium text-[var(--kw-amber-text)] transition-colors dark:border-[var(--kw-dark-amber-surface)] dark:text-[var(--kw-warning)]"
                >
                  Open sandbox
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href={route.liveHref}
                  className="dark:hover:bg-[var(--kw-dark-surface)]/60 inline-flex items-center justify-between rounded-2xl border border-[var(--kw-border)] px-4 py-3 text-sm font-medium text-[var(--kw-text)] transition-colors hover:border-[var(--kw-border)] hover:bg-[var(--kw-surface-alt)] dark:border-[var(--kw-dark-border)] dark:text-[var(--kw-dark-text)]"
                >
                  View live surface
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="bg-[var(--kw-surface-alt)]/80 dark:bg-[var(--kw-dark-bg)]/40 rounded-[1.5rem] border border-dashed border-[var(--kw-border)] p-3 sm:p-4 lg:p-6 dark:border-[var(--kw-dark-border)]">
        <h2 className="text-lg font-semibold text-[var(--kw-text)] dark:text-[var(--kw-dark-text)]">
          Graduation rule
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--kw-text-muted)] dark:text-[var(--kw-dark-text-muted)]">
          Retire each sandbox route once the corresponding live management experience reaches parity
          for the same operator journey, keeps auditability, and no longer depends on fixture-only
          behavior.
        </p>
      </section>
    </div>
  );
}
