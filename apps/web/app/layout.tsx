import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, Spline_Sans } from "next/font/google";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agent Control Plane",
  description: "Human-and-agent control plane for secrets, tasks, and playbooks.",
};

const fontSans = Spline_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const fontSerif = Fraunces({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const fontMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${fontSans.variable} ${fontSerif.variable} ${fontMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
