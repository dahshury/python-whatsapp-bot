import { toSceneFromDoc } from "@/shared/libs/documents";
import { computeSceneSignature } from "@/shared/libs/documents/scene-utils";

type RawScene = ReturnType<typeof toSceneFromDoc>;

export type DocumentSceneInitialData = Pick<
  RawScene,
  "elements" | "appState" | "files"
>;

export type DocumentSceneSnapshot = RawScene & {
  signature: string;
};

type ScenePromise<T> = Promise<T> & {
  resolve: (value: T) => void;
  reject: (error: Error) => void;
};

const DEFAULT_KEY = "__default__";

function createResolvablePromise<T>(): ScenePromise<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  }) as ScenePromise<T>;
  promise.resolve = resolve;
  promise.reject = reject;
  return promise;
}

function normalizeKey(waId: string | null | undefined): string {
  const trimmed = (waId || "").trim();
  return trimmed.length > 0 ? trimmed : DEFAULT_KEY;
}

type ScenePromiseBundle = {
  snapshot: ScenePromise<DocumentSceneSnapshot>;
  initialData: ScenePromise<DocumentSceneInitialData>;
};

function createSnapshot(
  doc: Record<string, unknown> | null | undefined
): DocumentSceneSnapshot {
  const raw = toSceneFromDoc(doc);
  const signature = computeSceneSignature(
    raw.elements || [],
    raw.appState || {},
    raw.files || {}
  );
  return {
    ...raw,
    signature,
  };
}

export type DocumentSceneLoader = {
  /**
   * Resets the loader for the provided waId and returns a blank scene snapshot.
   * Prepares a promise that will be resolved when the real document data arrives.
   */
  beginTransition: (waId: string | null | undefined) => DocumentSceneSnapshot;
  /**
   * Resolves the pending scene promise with the provided document payload and
   * returns the converted scene snapshot.
   */
  resolveScene: (
    waId: string | null | undefined,
    doc: Record<string, unknown> | null | undefined
  ) => DocumentSceneSnapshot;
  /**
   * Returns the promise associated with the specified waId without resetting it.
   */
  getInitialScenePromise: (
    waId: string | null | undefined
  ) => ScenePromise<DocumentSceneSnapshot>;
  /**
   * Returns a promise that resolves with the initial data tuple.
   */
  getInitialDataPromise: (
    waId: string | null | undefined
  ) => ScenePromise<DocumentSceneInitialData>;
  /**
   * Clears all cached promises – primarily for cleanup between tests or
   * component unmounts.
   */
  resetAll: () => void;
};

/**
 * Factory that provides promise-based scene loading. Each waId maintains a dedicated resolvable
 * promise that callers can await to know when the real scene payload arrived.
 */
export function createSceneLoader(): DocumentSceneLoader {
  const promiseMap = new Map<string, ScenePromiseBundle>();

  const ensurePromises = (
    waId: string | null | undefined,
    reset: boolean
  ): ScenePromiseBundle => {
    const key = normalizeKey(waId);
    if (!promiseMap.has(key) || reset) {
      const bundle = {
        snapshot: createResolvablePromise<DocumentSceneSnapshot>(),
        initialData: createResolvablePromise<DocumentSceneInitialData>(),
      };
      promiseMap.set(key, bundle);
      return bundle;
    }
    const existing = promiseMap.get(key);
    if (!existing) {
      // Should never happen but satisfy TypeScript
      throw new Error("[DocumentSceneLoader] Missing promise bundle");
    }
    return existing;
  };

  const beginTransition = (
    waId: string | null | undefined
  ): DocumentSceneSnapshot => {
    // Reset promises for this waId so that new listeners wait for fresh data.
    ensurePromises(waId, true);
    // Always return a blank scene to keep canvases in sync while loading.
    return createSnapshot(null);
  };

  const resolveScene = (
    waId: string | null | undefined,
    doc: Record<string, unknown> | null | undefined
  ): DocumentSceneSnapshot => {
    const key = normalizeKey(waId);
    const bundle = ensurePromises(key, false);
    const snapshot = createSnapshot(doc);
    try {
      bundle.snapshot.resolve(snapshot);
    } catch {
      // Promise may already be resolved; ignore to preserve current behaviour.
    }
    try {
      bundle.initialData.resolve({
        elements: snapshot.elements || [],
        appState: snapshot.appState || {},
        files: snapshot.files || {},
      });
    } catch {
      // Promise may already be resolved; ignore repeated resolutions.
    }
    return snapshot;
  };

  const getInitialScenePromise = (
    waId: string | null | undefined
  ): ScenePromise<DocumentSceneSnapshot> =>
    ensurePromises(waId, false).snapshot;

  const getInitialDataPromise = (
    waId: string | null | undefined
  ): ScenePromise<DocumentSceneInitialData> =>
    ensurePromises(waId, false).initialData;

  const resetAll = () => {
    promiseMap.clear();
  };

  return {
    beginTransition,
    resolveScene,
    getInitialScenePromise,
    getInitialDataPromise,
    resetAll,
  };
}
