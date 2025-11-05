"use client";

import {
  createContext,
  type FC,
  type PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import { BACKEND_CONNECTION } from "@/shared/config";
import {
  type BackendConnectionFailure,
  type BackendConnectionStatus,
  backendConnectionStore,
  markBackendChecking,
} from "@/shared/libs/backend-connection-store";
import { BackendConnectionOverlay } from "@/shared/ui/backend-connection-overlay";

type BackendConnectionContextValue = {
  status: BackendConnectionStatus;
  isConnected: boolean;
  lastError?: BackendConnectionFailure;
  retry: () => void;
};

const BackendConnectionContext = createContext<BackendConnectionContextValue>({
  status: "connected",
  isConnected: true,
  retry: () => {
    // Default no-op retry function
  },
});

export const BackendConnectionProvider: FC<PropsWithChildren> = ({
  children,
}) => {
  const snapshot = useSyncExternalStore(
    backendConnectionStore.subscribe,
    backendConnectionStore.getSnapshot,
    backendConnectionStore.getServerSnapshot
  );

  const handleRetry = useCallback(() => {
    markBackendChecking("Retrying connection");
    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        window.location.reload();
      }, BACKEND_CONNECTION.RETRY_RELOAD_DELAY_MS);
    }
  }, []);

  const contextValue = useMemo<BackendConnectionContextValue>(() => {
    const base: Omit<BackendConnectionContextValue, "lastError"> = {
      status: snapshot.status,
      isConnected: snapshot.status === "connected",
      retry: handleRetry,
    };
    return snapshot.lastError
      ? { ...base, lastError: snapshot.lastError }
      : base;
  }, [snapshot.status, snapshot.lastError, handleRetry]);

  const showOverlay = snapshot.status !== "connected";

  return (
    <BackendConnectionContext.Provider value={contextValue}>
      {children}
      {showOverlay ? (
        <BackendConnectionOverlay
          isRetrying={snapshot.status === "checking"}
          onRetry={handleRetry}
        />
      ) : null}
    </BackendConnectionContext.Provider>
  );
};

export function useBackendConnection(): BackendConnectionContextValue {
  return useContext(BackendConnectionContext);
}
