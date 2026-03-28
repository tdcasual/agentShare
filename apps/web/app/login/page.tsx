import { redirect } from "next/navigation";

import { loginManagementAction } from "../actions";
import { NavShell } from "../../components/nav-shell";
import { getLocale } from "../../lib/i18n-server";
import { tr } from "../../lib/i18n-shared";
import { getManagementSessionState } from "../../lib/management-session";
import { managementCredentialLabel } from "../../lib/ui";

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
  const locale = await getLocale();
  const nextPath = readSingleParam(params, "next") ?? "/secrets";
  const error = readSingleParam(params, "error");
  const loggedOut = readSingleParam(params, "logged_out");
  const session = await getManagementSessionState();

  if (session.active) {
    redirect(nextPath.startsWith("/") ? nextPath : "/secrets");
  }

  return (
    <NavShell
      variant="minimal"
      eyebrow={tr(locale, "Management login", "管理登录")}
      title={tr(locale, "Establish a human session for console management.", "建立管理控制台的人类会话。")}
      subtitle={tr(locale, "Use the bootstrap management credential once to mint a short-lived operator session cookie with its own session id. Runtime agent keys stay separate.", "使用一次管理引导口令换取带独立 session id 的短期 operator session cookie。运行时 Agent 访问密钥与管理会话相互隔离。")}
      activeHref="/login"
    >
      {loggedOut ? (
        <section className="notice success" role="status">
          {tr(locale, "The management session was cleared.", "管理会话已清除。")}
        </section>
      ) : null}
      {error ? (
        <section className="notice error" role="alert">
          {error === "missing-credential"
            ? tr(locale, "Enter the bootstrap management credential to continue.", "请输入 bootstrap 管理凭据以继续。")
            : error === "invalid-credential"
              ? tr(locale, "The bootstrap management credential was rejected.", "管理引导口令被拒绝。")
              : error === "session-expired"
                ? tr(locale, "The previous management session expired or became invalid. Sign in again to continue.", "之前的管理会话已过期或失效，请重新登录后继续。")
              : error === "api-disconnected"
                ? tr(locale, "The API base URL is not configured, so the login exchange cannot complete.", "未配置 API Base URL，无法完成登录交换。")
                : error === "session-cookie-missing"
                  ? tr(locale, "The API authenticated the login but did not return a session cookie.", "API 已通过认证但未返回 session cookie。")
                  : tr(locale, "The management session could not be created.", "无法创建管理会话。")}
        </section>
      ) : null}
      <section className="panel stack panel-limit">
        <div>
          <div className="kicker">{tr(locale, "Session exchange", "会话交换")}</div>
          <h2>{tr(locale, "Log in to management routes", "登录管理路由")}</h2>
          <p className="muted">
            {tr(locale, "Every successful login mints a fresh session id and expires automatically after the configured session TTL.", "每次成功登录都会生成新的 session id，并在配置的 session TTL 到期后自动失效。")}
          </p>
        </div>
        <form className="form" action={loginManagementAction}>
          <input type="hidden" name="next" value={nextPath} />
          <label>
            {managementCredentialLabel(locale)}
            <input name="bootstrap_key" type="password" autoComplete="current-password" required />
          </label>
          <button type="submit">{tr(locale, "Create management session", "创建管理会话")}</button>
        </form>
      </section>
    </NavShell>
  );
}
