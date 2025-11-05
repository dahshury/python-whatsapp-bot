"use client";

import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from "next-themes";

export function ThemeProvider(props: ThemeProviderProps) {
  const { children, ...restProps } = props;
  return <NextThemesProvider {...restProps}>{children}</NextThemesProvider>;
}
