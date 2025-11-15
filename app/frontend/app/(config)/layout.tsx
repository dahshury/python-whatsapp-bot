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
 * Layout for config page - needs full CSS and providers.
 */
export default function ConfigLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
