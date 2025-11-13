import type { ReadonlyURLSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type PersistenceGuardRefs,
  PersistenceGuardsService,
} from "./persistence-guards";

const HISTORY_STATE_KEY = "__documentsWaId";

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
  createShareableUrl: (value?: string | null) => string;
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
      const historyState = window.history.state as
        | Record<string, unknown>
        | null
        | undefined;
      const historyWaId =
        typeof historyState?.[HISTORY_STATE_KEY] === "string"
          ? (historyState[HISTORY_STATE_KEY] as string)
          : null;

      if (historyWaId && historyWaId !== defaultWaId) {
        return historyWaId;
      }

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

      const applyStateUpdate = (targetUrl: string) => {
        const currentState = window.history.state ?? {};
        const nextState = { ...currentState };

        if (!value || value === defaultWaId) {
          delete nextState[HISTORY_STATE_KEY];
        } else {
          nextState[HISTORY_STATE_KEY] = value;
        }

        window.history.replaceState(nextState, "", targetUrl);
      };

      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("waId");
        const search = url.searchParams.toString();
        const pathWithQuery = search
          ? `${url.pathname}?${search}`
          : url.pathname;
        const hash = url.hash ?? "";
        applyStateUpdate(`${pathWithQuery}${hash}`);
      } catch {
        try {
          const path = window.location.pathname;
          const hash = window.location.hash ?? "";
          applyStateUpdate(`${path}${hash}`);
        } catch {
          // Silently ignore URL manipulation errors
        }
      }
    },
    [defaultWaId]
  );

  const createShareableUrl = useCallback(
    (value?: string | null) => {
      let normalizedInput: string | null;
      if (typeof value === "string" && value.trim().length > 0) {
        normalizedInput = value.trim();
      } else if (waId && waId !== defaultWaId) {
        normalizedInput = waId;
      } else {
        normalizedInput = null;
      }

      if (!normalizedInput) {
        return "/documents";
      }

      const encodedWaId = encodeURIComponent(normalizedInput);

      if (typeof window === "undefined") {
        return `/documents?waId=${encodedWaId}`;
      }

      const origin = window.location.origin;
      return `${origin}/documents?waId=${encodedWaId}`;
    },
    [waId, defaultWaId]
  );

  const waIdPersistenceInitializedRef = useRef(false);

  useEffect(() => {
    const urlWaId = searchParams.get("waId");
    console.log("[useWaIdSource] Initial load effect", {
      urlWaId,
      currentWaId: waId,
      defaultWaId,
      currentUrl: typeof window !== 'undefined' ? window.location.href : 'N/A',
    });

    if (urlWaId && urlWaId !== defaultWaId) {
      console.log("[useWaIdSource] Found waId in URL, skipping sessionStorage check");
      return;
    }

    const storedWaId = readStoredWaId();
    console.log("[useWaIdSource] Read from sessionStorage:", storedWaId);
    
    const nextWaId =
      storedWaId && storedWaId !== defaultWaId ? storedWaId : defaultWaId;

    console.log("[useWaIdSource] Computed nextWaId:", nextWaId);

    if (nextWaId === waId) {
      console.log("[useWaIdSource] nextWaId matches current waId, updating URL only");
      pendingInitialLoadWaIdRef.current = nextWaId;
      if (nextWaId && nextWaId !== defaultWaId) {
        replaceWaIdInUrl(nextWaId);
      } else {
        replaceWaIdInUrl(null);
      }
      return;
    }

    pendingInitialLoadWaIdRef.current = nextWaId;
    if (nextWaId && nextWaId !== defaultWaId) {
      console.log("[useWaIdSource] Loading stored customer:", nextWaId);
      PersistenceGuardsService.scheduleIgnoreWindow(
        persistenceGuards,
        ignorePersistDelayMs
      );
      initializeCameraRef.current?.({});
      ensureInitialized(nextWaId).catch(() => {
        // Silently ignore initialization errors (handled by UI state)
      });
      replaceWaIdInUrl(nextWaId);
    } else {
      console.log("[useWaIdSource] No stored customer, clearing URL");
      replaceWaIdInUrl(null);
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
    replaceWaIdInUrl,
  ]);

  useEffect(() => {
    const urlWaId = searchParams.get("waId");
    if (!urlWaId) {
      return;
    }

    if (urlWaId === defaultWaId) {
      replaceWaIdInUrl(null);
      return;
    }

    PersistenceGuardsService.scheduleIgnoreWindow(
      persistenceGuards,
      ignorePersistDelayMs
    );
    pendingInitialLoadWaIdRef.current = urlWaId;
    initializeCameraRef.current?.({});
    ensureInitialized(urlWaId).catch(() => {
      // Silently ignore initialization errors (handled by UI state)
    });
    replaceWaIdInUrl(urlWaId);
    setWaId(urlWaId);
    persistWaId(urlWaId);
  }, [
    searchParams,
    ensureInitialized,
    initializeCameraRef,
    persistWaId,
    replaceWaIdInUrl,
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

  useEffect(() => {
    if (!waId || waId === defaultWaId) {
      replaceWaIdInUrl(null);
      return;
    }
    replaceWaIdInUrl(waId);
  }, [waId, defaultWaId, replaceWaIdInUrl]);

  return {
    waId,
    setWaId,
    persistWaId,
    replaceWaIdInUrl,
    createShareableUrl,
  } as const;
}
