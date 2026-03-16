import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agent Control Plane",
  description: "Human-and-agent control plane for secrets, tasks, and playbooks.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
