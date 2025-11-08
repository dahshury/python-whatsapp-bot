import type { ReactNode } from "react";
import { MinimalProviders } from "./providers";

export default function MinimalLayout({ children }: { children: ReactNode }) {
  return <MinimalProviders>{children}</MinimalProviders>;
}
