"use client";

import Link from "next/link";
import { useState } from "react";

import type { Locale } from "../lib/i18n-shared";
import { tr } from "../lib/i18n-shared";

export function AgentKeyDisplay({
  apiKey,
  apiBaseUrl,
  locale = "en",
}: {
  apiKey: string;
  apiBaseUrl?: string;
  locale?: Locale;
}) {
  const [copied, setCopied] = useState(false);

  if (!apiKey) return null;
  const resolvedBaseUrl = apiBaseUrl || "http://127.0.0.1:8000";
  const nextStepSnippet =
    `export ACP_BASE_URL=${resolvedBaseUrl}\n` +
    `export ACP_AGENT_KEY=${apiKey}\n` +
    "curl -sS \\\n" +
    '  -H "Authorization: Bearer $ACP_AGENT_KEY" \\\n' +
    '  "$ACP_BASE_URL/api/agents/me"';

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className="card warning-card"
    >
      <h3>{tr(locale, "New Agent API Key", "新的 Agent API Key")}</h3>
      <p className="muted">
        {tr(locale, "Copy this key now. It will not be shown again.", "请立即复制该 key。它不会再次显示。")}
      </p>
      <code className="key-value">
        {apiKey}
      </code>
      <button onClick={handleCopy}>
        {copied ? tr(locale, "Copied!", "已复制") : tr(locale, "Copy to clipboard", "复制到剪贴板")}
      </button>
      <p className="muted">
        {tr(locale, "Next step: verify the key with", "下一步：用")} <code>GET /api/agents/me</code>{" "}
        {tr(locale, "to verify the key.", "验证 key。")}
      </p>
      <pre className="code-block">
        <code>{nextStepSnippet}</code>
      </pre>
      <Link className="button-link secondary" href="/quickstart">
        {tr(locale, "Open quickstart", "打开快速开始")}
      </Link>
    </div>
  );
}
