type TldrawSnapshot = {
  type?: string;
  snapshot?: unknown;
  document?: unknown;
  elements?: unknown[];
  [key: string]: unknown;
};

type TldrawTemplate = {
  type?: string;
  snapshot?: { document?: Record<string, unknown> } | null;
  document?: Record<string, unknown> | null;
  elements?: unknown[];
  [key: string]: unknown;
};

function isShapeKey(key: string): boolean {
  if (key.startsWith("instance")) {
    return false;
  }
  if (key.startsWith("camera")) {
    return false;
  }
  if (key.startsWith("pointer")) {
    return false;
  }
  if (key.startsWith("presence")) {
    return false;
  }
  return true;
}

export function hasDocumentContent(doc: unknown): boolean {
  if (!doc || typeof doc !== "object") {
    return false;
  }

  const docObj = doc as TldrawSnapshot;

  if (docObj.type === "tldraw" && docObj.snapshot) {
    const snapshot = docObj.snapshot as { document?: Record<string, unknown> };
    if (snapshot?.document) {
      return Object.keys(snapshot.document).some(isShapeKey);
    }
    return false;
  }

  if (docObj.document && typeof docObj.document === "object") {
    const documentRecords = docObj.document as Record<string, unknown>;
    return Object.keys(documentRecords).some(isShapeKey);
  }

  return false;
}

export function isDocumentEmpty(snapshot: unknown | null): boolean {
  if (!snapshot) {
    return true;
  }
  return !hasDocumentContent(snapshot);
}

export function extractDocumentForSave(templateDoc: unknown): unknown {
  if (!templateDoc || typeof templateDoc !== "object") {
    return {
      type: "tldraw",
      snapshot: { document: {} },
    };
  }

  const docObj = templateDoc as TldrawTemplate;

  if (docObj.type === "tldraw" && docObj.snapshot) {
    return templateDoc;
  }

  if (docObj.document && typeof docObj.document === "object") {
    return {
      type: "tldraw",
      snapshot: {
        document: docObj.document,
      },
    };
  }

  return {
    type: "tldraw",
    snapshot: { document: {} },
  };
}

export function normalizeDocumentSnapshot(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") {
    return raw;
  }

  const unwrapSnapshot = (value: unknown): unknown => {
    if (!value || typeof value !== "object") {
      return value;
    }

    const candidate = value as {
      type?: string;
      snapshot?: unknown;
      state?: unknown;
    };

    if (candidate.type === "tldraw") {
      if ("snapshot" in candidate) {
        return unwrapSnapshot(candidate.snapshot ?? null);
      }
      if ("state" in candidate) {
        return unwrapSnapshot(candidate.state ?? null);
      }
    }

    if ("snapshot" in candidate) {
      return unwrapSnapshot(candidate.snapshot ?? null);
    }

    return value;
  };

  const normalized = unwrapSnapshot(raw);

  if (!normalized || typeof normalized !== "object") {
    return normalized;
  }

  const normalizedValue = normalized as {
    document?: unknown;
  };

  if (
    normalizedValue.document &&
    typeof normalizedValue.document === "object" &&
    "document" in (normalizedValue.document as Record<string, unknown>) &&
    !("store" in (normalizedValue.document as Record<string, unknown>)) &&
    !("schema" in (normalizedValue.document as Record<string, unknown>))
  ) {
    return {
      ...normalizedValue,
      document: (normalizedValue.document as { document?: unknown }).document,
    };
  }

  return normalized;
}
