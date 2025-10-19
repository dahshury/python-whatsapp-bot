"use client";
import {
	type BackendConnectionState,
	useBackendConnectionStore,
} from "@shared/libs/store/backend-connection-store";
import { createContext, type PropsWithChildren, useContext } from "react";

const BackendConnectionContext = createContext<BackendConnectionState>({
	isConnected: true,
});

export const BackendConnectionProvider: React.FC<PropsWithChildren> = ({
	children,
}) => {
	const isConnected = useBackendConnectionStore((s) => s.isConnected);
	const lastError = useBackendConnectionStore((s) => s.lastError);
	const value: BackendConnectionState =
		lastError !== undefined ? { isConnected, lastError } : { isConnected };
	return (
		<BackendConnectionContext.Provider value={value}>
			{children}
		</BackendConnectionContext.Provider>
	);
};

export function useBackendConnection(): BackendConnectionState {
	return useContext(BackendConnectionContext);
}
