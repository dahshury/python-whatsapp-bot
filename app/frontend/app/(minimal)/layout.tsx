import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "../globals.css";

export const metadata: Metadata = {
  title: "App Configuration",
  description: "Configure app settings",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

/**
 * Minimal layout for routes without sidebar/header.
 * Uses full CSS for proper styling.
 */
export default function MinimalLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
