import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Timestamp } from "firebase-admin/firestore";

const mockSearchService = vi.hoisted(() => ({
  searchNodes: vi.fn(),
}));

const mockNodeService = vi.hoisted(() => ({
  createNode: vi.fn(),
}));

const mockFirestoreKnowledge = vi.hoisted(() => ({
  listKnowledgeNodes: vi.fn(),
  getKnowledgeNode: vi.fn(),
  createKnowledgeEdge: vi.fn(),
}));

const mockOpenai = vi.hoisted(() => ({
  generateChatCompletion: vi.fn(),
}));

vi.mock("@/services/knowledgeSearchService", () => mockSearchService);
vi.mock("@/services/knowledgeNodeService", () => mockNodeService);
vi.mock("@/lib/firestore-knowledge", () => mockFirestoreKnowledge);
vi.mock("@/lib/openai", () => mockOpenai);

const fakeTimestamp = Timestamp.fromDate(new Date("2026-01-01"));

const fakeNode = {
  id: "node-1",
  type: "note" as const,
  title: "Projekt X",
  content: "Deadline 20 maja",
  tags: [],
  sources: [],
  embedding: [],
  createdAt: fakeTimestamp,
  updatedAt: fakeTimestamp,
  createdBy: "user" as const,
};

describe("isPublicUrl — SSRF protection", () => {
  let isPublicUrl: (url: string) => boolean;

  beforeEach(async () => {
    vi.resetModules();
    ({ isPublicUrl } = await import("@/services/knowledgeAIService"));
  });

  it("dopuszcza publiczne HTTPS URL", () => {
    expect(isPublicUrl("https://example.com/path")).toBe(true);
    expect(isPublicUrl("https://jan.ai")).toBe(true);
    expect(isPublicUrl("http://vercel.com")).toBe(true);
  });

  it("blokuje localhost", () => {
    expect(isPublicUrl("http://localhost")).toBe(false);
    expect(isPublicUrl("http://localhost:8080/admin")).toBe(false);
    expect(isPublicUrl("https://localhost/secret")).toBe(false);
  });

  it("blokuje 127.x.x.x loopback", () => {
    expect(isPublicUrl("http://127.0.0.1")).toBe(false);
    expect(isPublicUrl("http://127.1.2.3:9000")).toBe(false);
  });

  it("blokuje 169.254.x.x — cloud metadata (AWS/GCP/Azure)", () => {
    expect(isPublicUrl("http://169.254.169.254/latest/meta-data/")).toBe(false);
    expect(isPublicUrl("http://169.254.169.254/latest/meta-data/iam/security-credentials/")).toBe(
      false
    );
  });

  it("blokuje prywatne zakresy RFC 1918", () => {
    expect(isPublicUrl("http://10.0.0.1")).toBe(false);
    expect(isPublicUrl("http://10.255.255.255")).toBe(false);
    expect(isPublicUrl("http://172.16.0.1")).toBe(false);
    expect(isPublicUrl("http://172.31.255.255")).toBe(false);
    expect(isPublicUrl("http://192.168.1.1")).toBe(false);
    expect(isPublicUrl("http://192.168.100.200:8080")).toBe(false);
  });

  it("blokuje 100.64-127.x.x shared address space", () => {
    expect(isPublicUrl("http://100.64.0.1")).toBe(false);
    expect(isPublicUrl("http://100.127.255.255")).toBe(false);
  });

  it("blokuje IPv6 loopback i prywatne zakresy", () => {
    expect(isPublicUrl("http://[::1]/")).toBe(false);
    expect(isPublicUrl("http://[fc00::1]")).toBe(false);
    expect(isPublicUrl("http://[fd12:3456:789a::1]")).toBe(false);
    expect(isPublicUrl("http://[fe80::1]")).toBe(false);
  });

  it("blokuje protokoły inne niż http/https", () => {
    expect(isPublicUrl("ftp://example.com")).toBe(false);
    expect(isPublicUrl("file:///etc/passwd")).toBe(false);
    expect(isPublicUrl("javascript:alert(1)")).toBe(false);
  });

  it("blokuje nieprawidłowe URL", () => {
    expect(isPublicUrl("not-a-url")).toBe(false);
    expect(isPublicUrl("")).toBe(false);
  });

  it("nie blokuje 172.15.x.x ani 172.32.x.x — poza zakresem prywatnym", () => {
    expect(isPublicUrl("http://172.15.0.1")).toBe(true);
    expect(isPublicUrl("http://172.32.0.1")).toBe(true);
  });
});

describe("knowledgeAIService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("query — tryb wyszukiwania", () => {
    it("zwraca odpowiedź AI z węzłami jako źródłami", async () => {
      mockFirestoreKnowledge.listKnowledgeNodes.mockResolvedValue([]);
      mockSearchService.searchNodes.mockResolvedValue([{ node: fakeNode, score: 0.9 }]);
      mockOpenai.generateChatCompletion.mockResolvedValue("Deadline projektu X to 20 maja.");

      const { query } = await import("@/services/knowledgeAIService");
      const result = await query("user-1", { message: "kiedy deadline projektu X?", lang: "pl" });

      expect(mockSearchService.searchNodes).toHaveBeenCalledWith(
        "user-1",
        "kiedy deadline projektu X?"
      );
      expect(mockOpenai.generateChatCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gpt-4o-mini",
          messages: expect.arrayContaining([
            expect.objectContaining({ role: "system" }),
            expect.objectContaining({
              role: "user",
              content: expect.stringContaining("Projekt X"),
            }),
          ]),
        })
      );
      expect(result.text).toBe("Deadline projektu X to 20 maja.");
      expect(result.sources).toContain("Projekt X");
    });
  });

  describe("getUpcomingReminders", () => {
    it("zwraca węzły task/event z dueDate w ciągu 48h", async () => {
      const now = new Date();
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const in72h = new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString().split("T")[0];

      const upcoming = { ...fakeNode, type: "task" as const, dueDate: in24h };
      const tooLate = { ...fakeNode, id: "late", type: "task" as const, dueDate: in72h };
      const noDate = { ...fakeNode, id: "nodate", type: "task" as const };

      mockFirestoreKnowledge.listKnowledgeNodes.mockResolvedValue([upcoming, tooLate, noDate]);

      const { getUpcomingReminders } = await import("@/services/knowledgeAIService");
      const result = await getUpcomingReminders("user-1");

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("node-1");
    });

    it("ignoruje węzły typu note/resource", async () => {
      const noteWithDate = {
        ...fakeNode,
        type: "note" as const,
        dueDate: new Date(Date.now() + 60_000).toISOString().split("T")[0],
      };
      mockFirestoreKnowledge.listKnowledgeNodes.mockResolvedValue([noteWithDate]);

      const { getUpcomingReminders } = await import("@/services/knowledgeAIService");
      const result = await getUpcomingReminders("user-1");

      expect(result).toHaveLength(0);
    });
  });

  describe("buildConnections", () => {
    it("tworzy krawędzie dla podobnych węzłów", async () => {
      mockFirestoreKnowledge.getKnowledgeNode.mockResolvedValue(fakeNode);
      mockSearchService.searchNodes.mockResolvedValue([
        { node: { ...fakeNode, id: "node-2" }, score: 0.82 },
      ]);
      mockFirestoreKnowledge.createKnowledgeEdge.mockResolvedValue({});

      const { buildConnections } = await import("@/services/knowledgeAIService");
      await buildConnections("user-1", "node-1");

      expect(mockFirestoreKnowledge.createKnowledgeEdge).toHaveBeenCalledWith("user-1", {
        fromNodeId: "node-1",
        toNodeId: "node-2",
        relation: "related",
        strength: 0.82,
      });
    });

    it("nie tworzy krawędzi gdy węzeł nie istnieje", async () => {
      mockFirestoreKnowledge.getKnowledgeNode.mockResolvedValue(null);

      const { buildConnections } = await import("@/services/knowledgeAIService");
      await buildConnections("user-1", "nonexistent");

      expect(mockFirestoreKnowledge.createKnowledgeEdge).not.toHaveBeenCalled();
    });
  });
});
