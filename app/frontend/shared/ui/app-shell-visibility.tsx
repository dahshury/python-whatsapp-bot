"use client";

import {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useContext,
} from "react";

type AppShellVisibilityContextValue = {
  showShell: boolean;
  setShowShell: Dispatch<SetStateAction<boolean>>;
};

export const AppShellVisibilityContext =
  createContext<AppShellVisibilityContextValue | null>(null);

type AppShellVisibilityProviderProps = {
  value: AppShellVisibilityContextValue;
  children: ReactNode;
};

export function AppShellVisibilityProvider({
  value,
  children,
}: AppShellVisibilityProviderProps) {
  return (
    <AppShellVisibilityContext.Provider value={value}>
      {children}
    </AppShellVisibilityContext.Provider>
  );
}

const defaultContextValue: AppShellVisibilityContextValue = {
  showShell: true,
  setShowShell: () => {
    // Default no-op function
  },
};

export function useAppShellVisibility(): AppShellVisibilityContextValue {
  const context = useContext(AppShellVisibilityContext);
  return context ?? defaultContextValue;
}
