import { BACKEND_CONNECTION } from "@/shared/config";

type BackendConnectionStatus = "connected" | "checking" | "disconnected";

export type BackendConnectionFailure = {
  reason?: string;
  message?: string;
  status?: number;
  url?: string;
  responsePreview?: string;
  receivedAt: number;
};

export type BackendConnectionSnapshot = {
  status: BackendConnectionStatus;
  lastError?: BackendConnectionFailure;
};

type BackendConnectionFailureInput = Partial<
  Omit<BackendConnectionFailure, "receivedAt">
> & {
  reason?: string;
  responseBody?: string;
};

type Listener = () => void;

const listeners = new Set<Listener>();

const initialSnapshot: BackendConnectionSnapshot = {
  status: "connected",
};

let snapshot: BackendConnectionSnapshot = initialSnapshot;

// Connection stability tracking
let consecutiveFailures = 0;
let lastFailureTime = 0;
let debounceTimeoutId: ReturnType<typeof setTimeout> | null = null;
let gracePeriodTimeoutId: ReturnType<typeof setTimeout> | null = null;
let webSocketConnecting = false;
let webSocketConnectStartTime = 0;

// Use centralized configuration for connection stability
const CONNECTION_CONFIG = BACKEND_CONNECTION.STABILITY;

// WebSocket connection grace period (increased for slow EC2 instances)
const WS_CONNECTION_GRACE_PERIOD_MS = 15_000; // 15 seconds

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function areFailuresEqual(
  a?: BackendConnectionFailure,
  b?: BackendConnectionFailure
) {
  if (a === b) {
    return true;
  }
  if (!(a && b)) {
    return false;
  }
  return (
    a.reason === b.reason &&
    a.message === b.message &&
    a.status === b.status &&
    a.url === b.url &&
    a.responsePreview === b.responsePreview
  );
}

function toFailure(
  input: BackendConnectionFailureInput,
  previous?: BackendConnectionFailure
): BackendConnectionFailure {
  const failure: BackendConnectionFailure = {
    receivedAt: Date.now(),
  };
  const reason = input.reason?.trim() || previous?.reason;
  if (reason) {
    failure.reason = reason;
  }
  const message = input.message?.trim() || previous?.message;
  if (message) {
    failure.message = message;
  }
  const status = input.status ?? previous?.status;
  if (typeof status === "number") {
    failure.status = status;
  }
  const url = input.url ?? previous?.url;
  if (url) {
    failure.url = url;
  }
  const previewSource = input.responseBody
    ? input.responseBody.slice(
        0,
        BACKEND_CONNECTION.RESPONSE_PREVIEW_MAX_LENGTH
      )
    : (input.responsePreview ?? previous?.responsePreview);
  if (previewSource) {
    failure.responsePreview = previewSource;
  }
  return failure;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): BackendConnectionSnapshot {
  return snapshot;
}

export function getServerSnapshot(): BackendConnectionSnapshot {
  return initialSnapshot;
}

function clearAllTimers(): void {
  if (debounceTimeoutId) {
    clearTimeout(debounceTimeoutId);
    debounceTimeoutId = null;
  }
  if (gracePeriodTimeoutId) {
    clearTimeout(gracePeriodTimeoutId);
    gracePeriodTimeoutId = null;
  }
}

function resetFailureTracking(): void {
  consecutiveFailures = 0;
  lastFailureTime = 0;
  clearAllTimers();
}

export function markBackendConnected(): void {
  // Reset all failure tracking on successful connection
  resetFailureTracking();

  if (snapshot.status === "connected" && !snapshot.lastError) {
    return;
  }
  snapshot = {
    status: "connected",
  };
  emit();
}

export function markBackendChecking(reason?: string): void {
  const existingError = snapshot.lastError;
  let nextError: BackendConnectionFailure | undefined;
  if (existingError) {
    nextError = { ...existingError, receivedAt: Date.now() };
  } else if (reason?.trim()) {
    nextError = {
      reason: reason.trim(),
      receivedAt: Date.now(),
    };
  }
  const next: BackendConnectionSnapshot = {
    status: "checking",
    ...(nextError ? { lastError: nextError } : {}),
  };
  if (
    snapshot.status === next.status &&
    areFailuresEqual(snapshot.lastError, next.lastError)
  ) {
    return;
  }
  snapshot = next;
  emit();
}

function actuallyMarkDisconnected(failure: BackendConnectionFailure): void {
  const next: BackendConnectionSnapshot = {
    status: "disconnected",
    lastError: failure,
  };
  if (
    snapshot.status === next.status &&
    areFailuresEqual(snapshot.lastError, next.lastError)
  ) {
    return;
  }
  snapshot = next;
  emit();
}

/**
 * Mark that WebSocket connection is starting
 * This suppresses backend disconnection warnings during WS connection
 */
export function markWebSocketConnecting(): void {
  webSocketConnecting = true;
  webSocketConnectStartTime = Date.now();
}

/**
 * Mark that WebSocket connection completed (success or failure)
 */
export function markWebSocketConnectCompleted(): void {
  webSocketConnecting = false;
  webSocketConnectStartTime = 0;
}

export function markBackendDisconnected(
  reason: BackendConnectionFailureInput
): void {
  const now = Date.now();
  const timeSinceLastFailure = now - lastFailureTime;

  // Special handling: If WebSocket is connecting, be VERY tolerant of failures
  // Slow EC2 instances can take 10-15 seconds to establish WS connection
  if (webSocketConnecting) {
    const wsConnectDuration = now - webSocketConnectStartTime;
    if (wsConnectDuration < WS_CONNECTION_GRACE_PERIOD_MS) {
      return;
    }
  }

  // Reset consecutive failures if enough time has passed since last failure
  if (timeSinceLastFailure > CONNECTION_CONFIG.FAILURE_RESET_MS) {
    consecutiveFailures = 0;
  }

  // Check if this failure is within the failure window
  const isWithinWindow =
    timeSinceLastFailure < CONNECTION_CONFIG.FAILURE_WINDOW_MS;

  if (isWithinWindow) {
    consecutiveFailures += 1;
  } else {
    // Start a new failure sequence
    consecutiveFailures = 1;
  }

  lastFailureTime = now;
  const failure = toFailure(reason, snapshot.lastError);

  // If this is the first failure, start a grace period
  if (consecutiveFailures === 1) {
    // Clear any existing timers
    clearAllTimers();

    // Set grace period - don't show overlay immediately, give slow networks time
    gracePeriodTimeoutId = setTimeout(() => {
      // After grace period, if we're still having failures, they'll be counted
      gracePeriodTimeoutId = null;
    }, CONNECTION_CONFIG.GRACE_PERIOD_MS);
    return;
  }

  // Check if we've reached the failure threshold
  if (consecutiveFailures >= CONNECTION_CONFIG.FAILURE_THRESHOLD) {
    // Clear any existing debounce
    if (debounceTimeoutId) {
      clearTimeout(debounceTimeoutId);
      debounceTimeoutId = null;
    }

    // Debounce the disconnection to prevent flickering
    debounceTimeoutId = setTimeout(() => {
      debounceTimeoutId = null;

      // Double-check we're still having issues
      const timeSinceLastCheck = Date.now() - lastFailureTime;
      if (timeSinceLastCheck < CONNECTION_CONFIG.FAILURE_WINDOW_MS) {
        actuallyMarkDisconnected(failure);
      } else {
        resetFailureTracking();
      }
    }, CONNECTION_CONFIG.DEBOUNCE_DELAY_MS);
  }
}

export const backendConnectionStore = {
  subscribe,
  getSnapshot,
  getServerSnapshot,
  markConnected: markBackendConnected,
  markChecking: markBackendChecking,
  markDisconnected: markBackendDisconnected,
};

export type { BackendConnectionStatus };
