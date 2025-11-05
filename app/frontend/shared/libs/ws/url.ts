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
      const tab = getOrCreateTabId();

      // Check for explicit WebSocket URL from environment
      const publicWsUrl = process.env.NEXT_PUBLIC_WS_URL;
      if (publicWsUrl) {
        // If explicit WS URL is set, use it with tab parameter
        const url = new URL(publicWsUrl);
        url.searchParams.set("tab", tab);
        return url.toString();
      }

      // Auto-detect based on current location
      const isHttps = window.location.protocol === "https:";
      const host = window.location.hostname || "localhost";
      const wsProto = isHttps ? "wss" : "ws";
      const wsUrl = `${wsProto}://${host}:8000/ws?tab=${encodeURIComponent(tab)}`;
      return wsUrl;
    }
  } catch {
    // URL resolution failed - return default WebSocket URL
  }
  return "ws://localhost:8000/ws";
}

export { resolveWebSocketUrl, getOrCreateTabId };
