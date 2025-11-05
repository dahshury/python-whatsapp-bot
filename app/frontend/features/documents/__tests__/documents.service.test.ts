import { describe, expect, it } from "vitest";
import { createDocumentsService } from "../services/documents.service.factory";

// Minimal smoke test to ensure factory wiring works
describe("DocumentsService (smoke)", () => {
  it("should create service and expose required methods", () => {
    const svc = createDocumentsService();
    expect(typeof svc.getByWaId).toBe("function");
    expect(typeof svc.save).toBe("function");
    expect(typeof svc.ensureInitialized).toBe("function");
  });
});
