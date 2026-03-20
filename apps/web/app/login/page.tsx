import { redirect } from "next/navigation";

import { loginManagementAction } from "../actions";
import { NavShell } from "../../components/nav-shell";
import { hasManagementSession } from "../../lib/management-session";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readSingleParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const nextPath = readSingleParam(params, "next") ?? "/secrets";
  const error = readSingleParam(params, "error");
  const loggedOut = readSingleParam(params, "logged_out");

  if (await hasManagementSession()) {
    redirect(nextPath.startsWith("/") ? nextPath : "/secrets");
  }

  return (
    <NavShell
      eyebrow="Management login"
      title="Establish a human session for console management."
      subtitle="Use the bootstrap management credential once to mint a short-lived session cookie. Runtime agent keys stay separate."
    >
      {loggedOut ? (
        <section className="notice success" role="status">
          The management session was cleared.
        </section>
      ) : null}
      {error ? (
        <section className="notice error" role="alert">
          {error === "missing-credential"
            ? "Enter the bootstrap management credential to continue."
            : error === "invalid-credential"
              ? "The bootstrap management credential was rejected."
              : error === "api-disconnected"
                ? "The API base URL is not configured, so the login exchange cannot complete."
                : error === "session-cookie-missing"
                  ? "The API authenticated the login but did not return a session cookie."
                  : "The management session could not be created."}
        </section>
      ) : null}
      <section className="panel stack" style={{ maxWidth: "30rem" }}>
        <div>
          <div className="kicker">Session exchange</div>
          <h2>Log in to management routes</h2>
        </div>
        <form className="form" action={loginManagementAction}>
          <input type="hidden" name="next" value={nextPath} />
          <label>
            Bootstrap management credential
            <input name="bootstrap_key" type="password" autoComplete="current-password" required />
          </label>
          <button type="submit">Create management session</button>
        </form>
      </section>
    </NavShell>
  );
}
