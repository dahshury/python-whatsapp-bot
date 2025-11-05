import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolvePrefetch } from "../resolvers";
import { dashboardResolver } from "../resolvers/dashboard";
import { documentsResolver } from "../resolvers/documents";

vi.mock("@/compositions/documents/DocumentsPage", () => ({
  preloadDocumentsSection: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/compositions/dashboard/DashboardPage", () => ({
  preloadDashboardView: vi.fn().mockResolvedValue(undefined),
}));

const callPythonBackendCachedMock = vi.fn();

vi.mock("@/shared/libs/backend", async () => {
  const actual = await vi.importActual<typeof import("@/shared/libs/backend")>(
    "@/shared/libs/backend"
  );
  return {
    ...actual,
    callPythonBackendCached: callPythonBackendCachedMock,
  };
});

const mockRequest = {} as NextRequest;

beforeEach(() => {
  callPythonBackendCachedMock.mockReset();
});

describe("documentsResolver", () => {
  it("returns customer names when backend responds successfully", async () => {
    callPythonBackendCachedMock.mockResolvedValueOnce({
      success: true,
      data: {
        "wa-1": { wa_id: "wa-1", customer_name: "Alice" },
      },
    });

    const result = await documentsResolver("/documents", mockRequest);

    expect(callPythonBackendCachedMock).toHaveBeenCalledWith(
      "/customers/names",
      undefined,
      expect.objectContaining({
        revalidate: 300,
        keyParts: ["prefetch", "customers", "names"],
      })
    );
    expect(result.success).toBe(true);
    expect(result.payload?.queries).toEqual([
      {
        key: ["customer-names"],
        data: { "wa-1": { wa_id: "wa-1", customer_name: "Alice" } },
      },
    ]);
  });

  it("gracefully handles backend failures", async () => {
    callPythonBackendCachedMock.mockRejectedValueOnce(new Error("network"));

    const result = await documentsResolver("/documents", mockRequest);

    expect(result.success).toBe(true);
    expect(result.payload?.queries ?? []).toHaveLength(0);
  });
});

describe("dashboardResolver", () => {
  it("prefetches dashboard stats", async () => {
    callPythonBackendCachedMock.mockResolvedValueOnce({
      success: true,
      data: { reservations: 10, cancellations: 2 },
    });

    const result = await dashboardResolver("/dashboard", mockRequest);

    expect(callPythonBackendCachedMock).toHaveBeenCalledWith(
      "/stats",
      undefined,
      expect.objectContaining({
        revalidate: 120,
        keyParts: ["prefetch", "dashboard", "stats"],
      })
    );
    expect(result.success).toBe(true);
    expect(result.payload?.queries).toEqual([
      {
        key: ["dashboard", "stats"],
        data: { reservations: 10, cancellations: 2 },
      },
    ]);
  });

  it("returns empty payload when stats fetch fails", async () => {
    callPythonBackendCachedMock.mockRejectedValueOnce(new Error("oops"));

    const result = await dashboardResolver("/dashboard", mockRequest);

    expect(result.success).toBe(true);
    expect(result.payload?.queries ?? []).toHaveLength(0);
  });
});

describe("resolvePrefetch", () => {
  it("delegates to dashboard resolver for /dashboard path", async () => {
    const dashboardSpy = vi
      .spyOn(await import("../resolvers/dashboard"), "dashboardResolver")
      .mockResolvedValueOnce({ success: true, payload: {} });

    const result = await resolvePrefetch("/dashboard", mockRequest);
    expect(result.success).toBe(true);
    expect(dashboardSpy).toHaveBeenCalled();
    dashboardSpy.mockRestore();
  });

  it("falls back to default resolver for unknown paths", async () => {
    const result = await resolvePrefetch("/unknown", mockRequest);
    expect(result.success).toBe(true);
  });
});
