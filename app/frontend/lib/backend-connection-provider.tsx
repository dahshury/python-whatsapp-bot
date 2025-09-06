"use client";
import * as React from "react";

interface BackendConnectionState {
	isConnected: boolean;
	lastError?: string;
}

const BackendConnectionContext = React.createContext<BackendConnectionState>({
	isConnected: true,
});

export const BackendConnectionProvider: React.FC<React.PropsWithChildren> = ({
	children,
}) => {
	const [state] = React.useState<BackendConnectionState>({ isConnected: true });
	return (
		<BackendConnectionContext.Provider value={state}>
			{children}
		</BackendConnectionContext.Provider>
	);
};

export function useBackendConnection(): BackendConnectionState {
	return React.useContext(BackendConnectionContext);
}
