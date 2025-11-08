"use client";

import type { ReactNode } from "react";
import { TanstackQueryProvider } from "@/app/provider/tanstack-query/tanstack-query-provider";
import { ThemeProvider } from "@/shared/ui/theme-provider";
import { ThemeWrapper } from "@/shared/ui/theme-wrapper";

type MinimalProvidersProps = {
  children: ReactNode;
};

export function MinimalProviders({ children }: MinimalProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      disableTransitionOnChange
      enableSystem
    >
      <ThemeWrapper>
        <TanstackQueryProvider>{children}</TanstackQueryProvider>
      </ThemeWrapper>
    </ThemeProvider>
  );
}

