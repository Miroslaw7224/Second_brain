import { describe, it, expect } from "vitest";
import { DomainError } from "../../../lib/errors.js";
import { createMindMap, getMindMap, deleteMindMap } from "../../../services/mindMapService.js";

const runIntegration = !!process.env.RUN_INTEGRATION_TESTS;

describe("mindMapService (integration)", () => {
  it.skipIf(!runIntegration)(
    "when Firestore is available, create get and delete a mind map",
    async () => {
      const userId = "test-user-mindmap";
      const title = `e2e-map-${Date.now()}`;
      const created = await createMindMap(userId, title);
      expect(created.id).toBeTruthy();
      expect(created.title).toBe(title);

      const loaded = await getMindMap(userId, created.id);
      expect(loaded.rootNode.label).toBe(title);

      await deleteMindMap(userId, created.id);
      await expect(getMindMap(userId, created.id)).rejects.toThrow(DomainError);
    }
  );
});
