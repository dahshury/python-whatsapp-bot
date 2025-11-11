import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tldraw",
  description: "Minimal tldraw canvas",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

/**
 * Minimal layout matching the official tldraw Next.js template.
 * Imports minimal CSS that only includes tldraw styles.
 */
export default function MinimalLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
