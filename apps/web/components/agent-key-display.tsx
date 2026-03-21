"use client";

import Link from "next/link";
import { useState } from "react";

export function AgentKeyDisplay({ apiKey, apiBaseUrl }: { apiKey: string; apiBaseUrl?: string }) {
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
      <h3>New Agent API Key</h3>
      <p className="muted">
        Copy this key now. It will not be shown again.
      </p>
      <code className="key-value">
        {apiKey}
      </code>
      <button onClick={handleCopy}>
        {copied ? "Copied!" : "Copy to clipboard"}
      </button>
      <p className="muted">
        Next step: verify the key with <code>GET /api/agents/me</code>.
      </p>
      <pre className="code-block">
        <code>{nextStepSnippet}</code>
      </pre>
      <Link className="button-link secondary" href="/quickstart">
        Open quickstart
      </Link>
    </div>
  );
}
