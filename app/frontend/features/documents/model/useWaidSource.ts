import type { ReadonlyURLSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type PersistenceGuardRefs,
  PersistenceGuardsService,
} from "./persistence-guards";

type UseWaIdSourceParams = {
  defaultWaId: string;
  searchParams: ReadonlyURLSearchParams;
  ensureInitialized: (waId: string) => Promise<unknown>;
  initializeCameraRef: React.MutableRefObject<
    ((viewerCamera: Record<string, unknown>) => void) | null
  >;
  pendingInitialLoadWaIdRef: React.MutableRefObject<string | null>;
  persistenceGuards: PersistenceGuardRefs;
  ignorePersistDelayMs: number;
  storageKey: string;
};

export type UseWaIdSourceResult = {
  waId: string;
  setWaId: (waId: string) => void;
  persistWaId: (value: string | null) => void;
  replaceWaIdInUrl: (value: string | null) => void;
  stripWaIdFromUrl: () => void;
};

export function useWaIdSource(
  params: UseWaIdSourceParams
): UseWaIdSourceResult {
  const {
    defaultWaId,
    searchParams,
    ensureInitialized,
    initializeCameraRef,
    pendingInitialLoadWaIdRef,
    persistenceGuards,
    ignorePersistDelayMs,
    storageKey,
  } = params;

  const [waId, setWaId] = useState<string>(defaultWaId);

  const readStoredWaId = useCallback(() => {
    if (typeof window === "undefined") {
      return null;
    }
    try {
      const stored = window.sessionStorage.getItem(storageKey);
      if (!stored || stored === defaultWaId) {
        return null;
      }
      return stored;
    } catch {
      return null;
    }
  }, [defaultWaId, storageKey]);

  const persistWaId = useCallback(
    (value: string | null) => {
      if (typeof window === "undefined") {
        return;
      }
      try {
        if (!value || value === defaultWaId) {
          window.sessionStorage.removeItem(storageKey);
          return;
        }
        window.sessionStorage.setItem(storageKey, value);
      } catch {
        // Ignore persistence errors to avoid disrupting UX
      }
    },
    [defaultWaId, storageKey]
  );

  const replaceWaIdInUrl = useCallback(
    (value: string | null) => {
      if (typeof window === "undefined") {
        return;
      }
      try {
        const url = new URL(window.location.href);
        if (!value || value === defaultWaId) {
          url.searchParams.delete("waId");
        } else {
          url.searchParams.set("waId", value);
        }
        const query = url.searchParams.toString();
        const newUrl = query ? `${url.pathname}?${query}` : url.pathname;
        window.history.replaceState(null, "", newUrl);
      } catch {
        // Silently ignore URL manipulation errors
      }
    },
    [defaultWaId]
  );

  const stripWaIdFromUrl = useCallback(() => {
    replaceWaIdInUrl(null);
  }, [replaceWaIdInUrl]);

  const waIdPersistenceInitializedRef = useRef(false);

  useEffect(() => {
    const urlWaId = searchParams.get("waId");
    if (urlWaId && urlWaId !== defaultWaId) {
      return;
    }

    const storedWaId = readStoredWaId();
    const nextWaId =
      storedWaId && storedWaId !== defaultWaId ? storedWaId : defaultWaId;

    if (nextWaId === waId) {
      pendingInitialLoadWaIdRef.current = nextWaId;
      return;
    }

    pendingInitialLoadWaIdRef.current = nextWaId;
    if (nextWaId && nextWaId !== defaultWaId) {
      PersistenceGuardsService.scheduleIgnoreWindow(
        persistenceGuards,
        ignorePersistDelayMs
      );
      initializeCameraRef.current?.({});
      ensureInitialized(nextWaId).catch(() => {
        // Silently ignore initialization errors (handled by UI state)
      });
    }
    setWaId(nextWaId);
  }, [
    searchParams,
    waId,
    readStoredWaId,
    ensureInitialized,
    initializeCameraRef,
    pendingInitialLoadWaIdRef,
    persistenceGuards,
    defaultWaId,
    ignorePersistDelayMs,
  ]);

  useEffect(() => {
    const urlWaId = searchParams.get("waId");
    if (urlWaId && urlWaId !== defaultWaId) {
      PersistenceGuardsService.scheduleIgnoreWindow(
        persistenceGuards,
        ignorePersistDelayMs
      );
      pendingInitialLoadWaIdRef.current = urlWaId;
      initializeCameraRef.current?.({});
      ensureInitialized(urlWaId).catch(() => {
        // Silently ignore initialization errors (handled by UI state)
      });
      setWaId(urlWaId);
      persistWaId(urlWaId);
      stripWaIdFromUrl();
    }
  }, [
    searchParams,
    ensureInitialized,
    initializeCameraRef,
    persistWaId,
    stripWaIdFromUrl,
    persistenceGuards,
    pendingInitialLoadWaIdRef,
    defaultWaId,
    ignorePersistDelayMs,
  ]);

  useEffect(() => {
    if (!waIdPersistenceInitializedRef.current) {
      waIdPersistenceInitializedRef.current = true;
      return;
    }
    if (!waId || waId === defaultWaId) {
      persistWaId(null);
      return;
    }
    persistWaId(waId);
  }, [waId, persistWaId, defaultWaId]);

  return {
    waId,
    setWaId,
    persistWaId,
    replaceWaIdInUrl,
    stripWaIdFromUrl,
  } as const;
}
