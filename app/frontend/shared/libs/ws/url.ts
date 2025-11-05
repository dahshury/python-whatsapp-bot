// Constants for tab ID generation
const RADIX_BASE_36 = 36;
const RANDOM_STRING_START_INDEX = 2;

function getOrCreateTabId(): string {
  try {
    if (typeof window === "undefined") {
      return "server";
    }
    const KEY = "ws_tab_id_v1";
    let id = window.sessionStorage.getItem(KEY);
    if (!id) {
      id = `${Math.random().toString(RADIX_BASE_36).slice(RANDOM_STRING_START_INDEX)}-${Date.now().toString(RADIX_BASE_36)}`;
      window.sessionStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    // Session storage failed - return timestamp-based ID
    return `${Date.now()}`;
  }
}

function resolveWebSocketUrl(): string {
  try {
    if (typeof window !== "undefined") {
      const isHttps = window.location.protocol === "https:";
      const host = window.location.hostname || "localhost";
      const wsProto = isHttps ? "wss" : "ws";
      const tab = getOrCreateTabId();
      const wsUrl = `${wsProto}://${host}:8000/ws?tab=${encodeURIComponent(tab)}`;
      return wsUrl;
    }
  } catch {
    // URL resolution failed - return default WebSocket URL
  }
  return "ws://localhost:8000/ws";
}

/**
 * Get the WebSocket connection port
 */
function getWebSocketPort(): number {
  try {
    if (typeof window !== "undefined") {
      // Check if we're on a non-standard port (like when deployed)
      const currentPort = window.location.port;
      // If we're on port 3000 (dev), use 8000 for backend
      // Otherwise assume backend is on same host
      return currentPort === "3000" ? 8000 : Number(currentPort) || 8000;
    }
  } catch {
    // Port resolution failed - return default
  }
  return 8000;
}

export { resolveWebSocketUrl, getOrCreateTabId };
