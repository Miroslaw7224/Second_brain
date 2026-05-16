import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Timestamp } from "firebase-admin/firestore";

const mockSearchService = vi.hoisted(() => ({
  searchNodes: vi.fn(),
}));

const mockDnsLookup = vi.hoisted(() =>
  vi.fn(async () => [{ address: "8.8.8.8", family: 4 } as const])
);

vi.mock("node:dns/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:dns/promises")>();
  return { ...actual, lookup: mockDnsLookup };
});

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
  let isPublicUrl: (url: string) => Promise<boolean>;

  beforeEach(async () => {
    vi.resetModules();
    mockDnsLookup.mockResolvedValue([{ address: "8.8.8.8", family: 4 }]);
    ({ isPublicUrl } = await import("@/services/knowledgeAIService"));
  });

  it("dopuszcza publiczne HTTPS URL", async () => {
    await expect(isPublicUrl("https://example.com/path")).resolves.toBe(true);
    await expect(isPublicUrl("https://jan.ai")).resolves.toBe(true);
    await expect(isPublicUrl("http://vercel.com")).resolves.toBe(true);
  });

  it("blokuje localhost", async () => {
    await expect(isPublicUrl("http://localhost")).resolves.toBe(false);
    await expect(isPublicUrl("http://localhost:8080/admin")).resolves.toBe(false);
    await expect(isPublicUrl("https://localhost/secret")).resolves.toBe(false);
  });

  it("blokuje 127.x.x.x loopback", async () => {
    await expect(isPublicUrl("http://127.0.0.1")).resolves.toBe(false);
    await expect(isPublicUrl("http://127.1.2.3:9000")).resolves.toBe(false);
  });

  it("blokuje 169.254.x.x — cloud metadata (AWS/GCP/Azure)", async () => {
    await expect(isPublicUrl("http://169.254.169.254/latest/meta-data/")).resolves.toBe(false);
    await expect(
      isPublicUrl("http://169.254.169.254/latest/meta-data/iam/security-credentials/")
    ).resolves.toBe(false);
  });

  it("blokuje prywatne zakresy RFC 1918", async () => {
    await expect(isPublicUrl("http://10.0.0.1")).resolves.toBe(false);
    await expect(isPublicUrl("http://10.255.255.255")).resolves.toBe(false);
    await expect(isPublicUrl("http://172.16.0.1")).resolves.toBe(false);
    await expect(isPublicUrl("http://172.31.255.255")).resolves.toBe(false);
    await expect(isPublicUrl("http://192.168.1.1")).resolves.toBe(false);
    await expect(isPublicUrl("http://192.168.100.200:8080")).resolves.toBe(false);
  });

  it("blokuje 100.64-127.x.x shared address space", async () => {
    await expect(isPublicUrl("http://100.64.0.1")).resolves.toBe(false);
    await expect(isPublicUrl("http://100.127.255.255")).resolves.toBe(false);
  });

  it("blokuje IPv6 loopback i prywatne zakresy", async () => {
    await expect(isPublicUrl("http://[::1]/")).resolves.toBe(false);
    await expect(isPublicUrl("http://[fc00::1]")).resolves.toBe(false);
    await expect(isPublicUrl("http://[fd12:3456:789a::1]")).resolves.toBe(false);
    await expect(isPublicUrl("http://[fe80::1]")).resolves.toBe(false);
  });

  it("blokuje hostnames które rozwiązują się na prywatne IP", async () => {
    mockDnsLookup.mockResolvedValueOnce([{ address: "10.0.0.1", family: 4 }]);
    await expect(isPublicUrl("http://evil.example/private")).resolves.toBe(false);
  });

  it("blokuje protokoły inne niż http/https", async () => {
    await expect(isPublicUrl("ftp://example.com")).resolves.toBe(false);
    await expect(isPublicUrl("file:///etc/passwd")).resolves.toBe(false);
    await expect(isPublicUrl("javascript:alert(1)")).resolves.toBe(false);
  });

  it("blokuje nieprawidłowe URL", async () => {
    await expect(isPublicUrl("not-a-url")).resolves.toBe(false);
    await expect(isPublicUrl("")).resolves.toBe(false);
  });

  it("nie blokuje 172.15.x.x ani 172.32.x.x — poza zakresem prywatnym", async () => {
    await expect(isPublicUrl("http://172.15.0.1")).resolves.toBe(true);
    await expect(isPublicUrl("http://172.32.0.1")).resolves.toBe(true);
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
