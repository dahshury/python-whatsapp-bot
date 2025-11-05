import { describe, expect, it } from "vitest";
import { EventDateTime } from "@/entities/event/value-objects/event-datetime.vo";

describe("EventDateTime VO", () => {
  it("normalizes ISO strings", () => {
    const vo = new EventDateTime("2025-01-02T03:04:05Z");
    expect(typeof vo.value).toBe("string");
    expect(vo.value).toContain("2025");
  });
});
