"use client";

import {
  createContext,
  type ReactNode,
  type RefObject,
  useContext,
  useMemo,
  useState,
} from "react";
import type { CalendarCoreRef } from "@/features/calendar";

export type DockBridgeState = {
  calendarRef?: RefObject<CalendarCoreRef | null> | null;
  currentCalendarView?: string;
  onCalendarViewChange?: (view: string) => void;
  // Dual calendar additions
  rightCalendarRef?: React.RefObject<CalendarCoreRef | null> | null;
  rightCalendarView?: string;
  onRightCalendarViewChange?: (view: string) => void;
};

type DockBridgeContextValue = {
  state: DockBridgeState;
  setState: (
    next: DockBridgeState | ((prev: DockBridgeState) => DockBridgeState)
  ) => void;
  reset: () => void;
};

const DockBridgeContext = createContext<DockBridgeContextValue | null>(null);

export function DockBridgeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DockBridgeState>({});

  const value = useMemo<DockBridgeContextValue>(
    () => ({ state, setState, reset: () => setState({}) }),
    [state]
  );

  return (
    <DockBridgeContext.Provider value={value}>
      {children}
    </DockBridgeContext.Provider>
  );
}

export function useDockBridge(): DockBridgeContextValue {
  const ctx = useContext(DockBridgeContext);
  if (!ctx) {
    throw new Error("useDockBridge must be used within DockBridgeProvider");
  }
  return ctx;
}
