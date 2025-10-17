"use client";
import {
	createContext,
	type PropsWithChildren,
	useContext,
	useState,
} from "react";

type BackendConnectionState = {
	isConnected: boolean;
	lastError?: string;
};

const BackendConnectionContext = createContext<BackendConnectionState>({
	isConnected: true,
});

export const BackendConnectionProvider: React.FC<PropsWithChildren> = ({
	children,
}) => {
	const [state] = useState<BackendConnectionState>({ isConnected: true });
	return (
		<BackendConnectionContext.Provider value={state}>
			{children}
		</BackendConnectionContext.Provider>
	);
};

export function useBackendConnection(): BackendConnectionState {
	return useContext(BackendConnectionContext);
}
