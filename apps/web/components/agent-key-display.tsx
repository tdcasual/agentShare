"use client";

import { useState } from "react";

export function AgentKeyDisplay({ apiKey }: { apiKey: string }) {
  const [copied, setCopied] = useState(false);

  if (!apiKey) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className="card"
      style={{ border: "2px solid var(--color-warning, #f59e0b)", marginBottom: "1rem" }}
    >
      <h3>New Agent API Key</h3>
      <p className="muted">
        Copy this key now. It will not be shown again.
      </p>
      <code style={{ wordBreak: "break-all", display: "block", padding: "0.5rem", background: "var(--color-surface, #1e1e1e)" }}>
        {apiKey}
      </code>
      <button onClick={handleCopy} style={{ marginTop: "0.5rem" }}>
        {copied ? "Copied!" : "Copy to clipboard"}
      </button>
    </div>
  );
}
