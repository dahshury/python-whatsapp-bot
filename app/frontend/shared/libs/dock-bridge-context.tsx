"use client";

import {
	type DockBridgeState as DockBridgeStoreState,
	useDockBridgeStore,
} from "@shared/libs/store/dock-bridge-store";
import { createContext, type ReactNode, useContext, useMemo } from "react";

export type DockBridgeState = DockBridgeStoreState;

type DockBridgeContextValue = {
	state: DockBridgeState;
	setState: (
		next: DockBridgeState | ((prev: DockBridgeState) => DockBridgeState)
	) => void;
	reset: () => void;
};

const DockBridgeContext = createContext<DockBridgeContextValue | null>(null);

export function DockBridgeProvider({ children }: { children: ReactNode }) {
	const state = useDockBridgeStore((s) => s.state);
	const setState = useDockBridgeStore((s) => s.setState);
	const reset = useDockBridgeStore((s) => s.reset);

	const value = useMemo<DockBridgeContextValue>(
		() => ({ state, setState, reset }),
		[state, setState, reset]
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
