import { create } from "zustand";

export type BackendConnectionState = {
	isConnected: boolean;
	lastError?: string;
};

type BackendConnectionActions = {
	setConnected: (isConnected: boolean) => void;
	setLastError: (lastError?: string) => void;
};

type BackendConnectionStore = BackendConnectionState & BackendConnectionActions;

export const useBackendConnectionStore = create<BackendConnectionStore>()(
	(set) => ({
		isConnected: true,
		setConnected: (isConnected) => set({ isConnected }),
		setLastError: (lastError) => {
			const update: Partial<BackendConnectionStore> =
				lastError !== undefined ? { lastError } : {};
			set(update);
		},
	})
);
