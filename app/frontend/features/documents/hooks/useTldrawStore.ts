import { useEffect, useMemo, useRef, useState } from "react";
import { createTLStore, loadSnapshot, type TLStore } from "tldraw";

export type TldrawStoreState =
  | { status: "loading" }
  | { status: "ready"; store: TLStore }
  | { status: "error"; error?: unknown };

const snapshotKeyCache = new WeakMap<object, string>();
const FORCE_RELOAD_CLEAR_DELAY_MS = 200;

function getSnapshotKey(snapshot: unknown): string {
  if (snapshot === null || snapshot === undefined) {
    return "";
  }

  if (typeof snapshot !== "object") {
    try {
      return JSON.stringify(snapshot);
    } catch {
      return "";
    }
  }

  const cached = snapshotKeyCache.get(snapshot as object);
  if (cached) {
    return cached;
  }

  let serialized = "";
  try {
    serialized = JSON.stringify(snapshot);
  } catch {
    return "";
  }

  snapshotKeyCache.set(snapshot as object, serialized);
  return serialized;
}

type UseTldrawStoreArgs = {
  snapshot: unknown;
  snapshotKey?: string | null;
  isLoading: boolean;
  hasError?: boolean;
  error?: unknown;
  waId?: string | null;
  enabled?: boolean;
};

/**
 * Initializes a TLDraw store asynchronously using the provided snapshot.
 * Creates the store once per waId and reuses it, only loading snapshots when they change.
 * Mirrors the TLDraw documentation pattern for loading remote snapshots.
 */
export function useTldrawStore({
  snapshot,
  snapshotKey,
  isLoading,
  hasError,
  error,
  waId,
  enabled = true,
}: UseTldrawStoreArgs): TldrawStoreState {
  // Create store once per waId - don't recreate on snapshot changes
  const storeRef = useRef<TLStore | null>(null);
  const lastWaIdRef = useRef<string | null>(null);
  const lastSnapshotRef = useRef<string>("");
  const processedForceReloadRef = useRef<string | null>(null);
  const lastProcessedFlagRef = useRef<number | null>(null);

  const [storeState, setStoreState] = useState<TldrawStoreState>({
    status: "loading",
  });

  // Create store once per waId
  const store = useMemo<TLStore | null>(() => {
    if (!enabled) {
      return storeRef.current;
    }

    // If waId changed, create new store
    if (waId !== lastWaIdRef.current) {
      lastWaIdRef.current = waId ?? null;
      // Reset snapshot ref when waId changes
      lastSnapshotRef.current = "";
      // Reset force reload tracking when waId changes
      processedForceReloadRef.current = null;
      lastProcessedFlagRef.current = null;
      storeRef.current = createTLStore();
      return storeRef.current;
    }
    // Reuse existing store or create if doesn't exist
    if (!storeRef.current) {
      storeRef.current = createTLStore();
    }
    return storeRef.current;
  }, [waId, enabled]);

  // Load snapshot when it changes (but don't recreate store)
  useEffect(() => {
    let cancelled = false;

    if (!(enabled && store)) {
      setStoreState({ status: "loading" });
      return;
    }

    const activeStore: TLStore = store;

    function initializeStore(currentStore: TLStore) {
      if (hasError) {
        setStoreState({ status: "error", error });
        return;
      }

      if (isLoading) {
        setStoreState({ status: "loading" });
        return;
      }

      setStoreState({ status: "loading" });

      try {
        const prepareSnapshotForLoad = (
          value: unknown
        ): null | {
          document?: {
            schema: unknown;
            store: unknown;
          };
          session?: unknown;
        } => {
          if (!value || typeof value !== "object") {
            return null;
          }

          const schema = currentStore.schema.serialize();

          const coerceDocument = (
            docValue: unknown
          ): { schema: unknown; store: unknown } | undefined => {
            if (!docValue || typeof docValue !== "object") {
              return;
            }

            const docRecord = docValue as Record<string, unknown>;

            if ("snapshot" in docRecord) {
              return coerceDocument(docRecord.snapshot);
            }

            if ("store" in docRecord) {
              return {
                store: (docRecord.store as unknown) ?? {},
                schema: docRecord.schema ?? schema,
              };
            }

            if ("document" in docRecord && "schema" in docRecord) {
              return {
                store: (docRecord.document as unknown) ?? {},
                schema: docRecord.schema ?? schema,
              };
            }

            if ("records" in docRecord) {
              return {
                store: docRecord.records ?? {},
                schema: docRecord.schema ?? schema,
              };
            }

            return {
              store: docRecord,
              schema,
            };
          };

          const snapshotRecord = value as Record<string, unknown>;
          const session = snapshotRecord.session;

          if ("store" in snapshotRecord || "schema" in snapshotRecord) {
            const document = coerceDocument(snapshotRecord);
            if (document) {
              return {
                document,
                ...(session !== undefined ? { session } : {}),
              };
            }
            return session !== undefined ? { session } : null;
          }

          if ("document" in snapshotRecord || "session" in snapshotRecord) {
            const document = coerceDocument(snapshotRecord.document);
            const result: Record<string, unknown> = {};
            if (document) {
              result.document = document;
            }
            if (session !== undefined) {
              result.session = session;
            }
            return Object.keys(result).length > 0
              ? (result as typeof result)
              : null;
          }

          const fallbackDocument = coerceDocument(snapshotRecord);
          return fallbackDocument ? { document: fallbackDocument } : null;
        };

        // Check if we need to force reload (e.g., after clearing canvas)
        let shouldForceReload = false;
        try {
          const forceReloadData = (
            globalThis as unknown as {
              __docForceReloadSnapshot?: {
                waId: string;
                timestamp: number;
              } | null;
            }
          ).__docForceReloadSnapshot;

          const forceReloadWaId = forceReloadData?.waId;
          const forceReloadTimestamp = forceReloadData?.timestamp;

          // Reset processed flag if the timestamp changed (new clear operation)
          if (
            forceReloadTimestamp !== undefined &&
            forceReloadTimestamp !== lastProcessedFlagRef.current
          ) {
            processedForceReloadRef.current = null;
            lastProcessedFlagRef.current = forceReloadTimestamp;
          }

          if (
            forceReloadWaId === waId &&
            processedForceReloadRef.current !== forceReloadTimestamp?.toString()
          ) {
            // Reset snapshot ref to force reload on next snapshot
            lastSnapshotRef.current = "";
            shouldForceReload = true;
            // Mark this store as having processed the force reload
            processedForceReloadRef.current =
              forceReloadTimestamp?.toString() ?? null;
            // Clear the flag after a delay to allow other stores to process it
            // Use a longer delay to handle rapid successive clears
            setTimeout(() => {
              try {
                const currentFlag = (
                  globalThis as unknown as {
                    __docForceReloadSnapshot?: {
                      waId: string;
                      timestamp: number;
                    } | null;
                  }
                ).__docForceReloadSnapshot;
                // Only clear if it's still the same timestamp (hasn't changed)
                if (currentFlag?.timestamp === forceReloadTimestamp) {
                  (
                    globalThis as unknown as {
                      __docForceReloadSnapshot?: {
                        waId: string;
                        timestamp: number;
                      } | null;
                    }
                  ).__docForceReloadSnapshot = null;
                  lastProcessedFlagRef.current = null;
                }
              } catch {
                // Ignore flag clear failures
              }
            }, FORCE_RELOAD_CLEAR_DELAY_MS);
          }
        } catch {
          // Ignore flag check failures
        }

        // Serialize snapshot to detect changes
        const snapshotString = snapshotKey ?? getSnapshotKey(snapshot);

        // Load if snapshot changed OR if we're forcing a reload
        if (
          snapshot &&
          typeof snapshot === "object" &&
          (snapshotString !== lastSnapshotRef.current || shouldForceReload)
        ) {
          const snapshotToLoad = prepareSnapshotForLoad(snapshot);

          if (snapshotToLoad) {
            // Use mergeRemoteChanges to prevent triggering listeners during load
            currentStore.mergeRemoteChanges(() => {
              loadSnapshot(
                currentStore,
                snapshotToLoad as Parameters<typeof loadSnapshot>[1]
              );
            });
          }
          lastSnapshotRef.current = snapshotString;
        } else if (snapshotString !== lastSnapshotRef.current) {
          lastSnapshotRef.current = snapshotString;
        }

        if (!cancelled) {
          setStoreState({ status: "ready", store: currentStore });
        }
      } catch (loadError) {
        if (!cancelled) {
          setStoreState({ status: "error", error: loadError });
        }
      }
    }

    initializeStore(activeStore);

    return () => {
      cancelled = true;
    };
  }, [snapshot, snapshotKey, isLoading, hasError, error, store, enabled, waId]);

  return storeState;
}
