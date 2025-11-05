import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useDocumentScene } from "@/features/documents";
import { QueryWrapper } from "@/shared/libs/__tests__/wrappers/QueryWrapper";

// Minimal smoke test to ensure the hook can mount and returns shape
describe("useDocumentScene (smoke)", () => {
  it("should mount and return expected shape", () => {
    const { result } = renderHook(() => useDocumentScene(""), {
      wrapper: QueryWrapper as React.FC,
    });
    expect(result.current).toHaveProperty("loading");
    expect(result.current).toHaveProperty("handleCanvasChange");
    expect(result.current).toHaveProperty("onExcalidrawAPI");
    expect(result.current).toHaveProperty("saveStatus");
  });
});
